import streamlit as st
import os
import shutil
import pandas as pd
from core.pdf_processor import PDFProcessor
from core.detector import VoterDetector
from core.db_bridge import get_constituencies, save_booth_data

# ==========================================
# CONFIGURATION
# ==========================================
UPLOAD_DIR = "data/raw_pdf"
PAGES_DIR = "data/page_images"
VOTER_CROPS_DIR = "data/voter_crops"

# Set up directories
for d in [UPLOAD_DIR, PAGES_DIR, VOTER_CROPS_DIR]:
    os.makedirs(d, exist_ok=True)

st.set_page_config(page_title="Voter Digitizer - Phase 1", layout="wide")

st.title("🗳️ Voter List Digitization - Box Extraction")
st.markdown("""
### Phase 1: Upload & Box Extraction
This tool extracts individual voter boxes from a scanned PDF list. 
It automatically identifies the start and end of the voter records.
""")

# ==========================================
# UI: SIDEBAR / SETTINGS
# ==========================================
with st.sidebar:
    st.header("Settings")
    dpi = st.number_input("Scan DPI", value=300, min_value=72, max_value=600)
    if st.button("Clear All Data"):
        for d in [PAGES_DIR, VOTER_CROPS_DIR]:
            shutil.rmtree(d, ignore_errors=True)
            os.makedirs(d, exist_ok=True)
        # Clear batch results and export files
        for f in ["data/batch_results.json", "data/voters_final_export.csv"]:
            if os.path.exists(f): os.remove(f)
        if "batch_data" in st.session_state:
            st.session_state.batch_data = []
        st.success("All data and progress cleared.")
        st.rerun()

# ==========================================
# UI: UPLOAD
# ==========================================
uploaded_file = st.file_uploader("Upload Voter List PDF", type=["pdf"])

if uploaded_file:
    pdf_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
    with open(pdf_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    
    st.info(f"PDF Uploaded: {uploaded_file.name}")

    if st.button("🚀 Start Extraction Process"):
        with st.status("Processing PDF...", expanded=True) as status:
            # 1. Convert PDF to Images
            st.write("Converting PDF to high-res images...")
            processor = PDFProcessor()
            try:
                page_images = processor.convert_to_images(pdf_path, PAGES_DIR, dpi=dpi)
                st.success(f"Converted {len(page_images)} pages.")
            except Exception as e:
                st.error(f"Error during PDF conversion: {e}")
                st.stop()

            # 2. Detect and Extract Boxes
            st.write("Scanning pages for voter boxes...")
            detector = VoterDetector()
            
            total_voters = 0
            extraction_started = False
            empty_page_count = 0
            MAX_EMPTY_PAGES = 2
            
            progress_bar = st.progress(0)
            
            for i, page_path in enumerate(page_images):
                page_num = i + 1
                progress_bar.progress(page_num / len(page_images))
                
                boxes = detector.detect_voter_boxes(page_path)
                
                if boxes:
                    empty_page_count = 0 # Reset count
                    if not extraction_started:
                        st.write(f"✅ Found first voter box on page {page_num}. Starting extraction...")
                        extraction_started = True
                    
                    saved_count = detector.crop_and_save(
                        page_path, 
                        boxes, 
                        VOTER_CROPS_DIR, 
                        page_num, 
                        start_index=total_voters
                    )
                    total_voters += saved_count
                    st.write(f"Page {page_num}: Extracted {saved_count} boxes.")
                else:
                    if extraction_started:
                        empty_page_count += 1
                        if empty_page_count >= MAX_EMPTY_PAGES:
                            st.write(f"🛑 No boxes found for {MAX_EMPTY_PAGES} consecutive pages. Ending extraction.")
                            break
                        else:
                            st.write(f"⚠️ Page {page_num}: No boxes detected. Skipping...")
                    else:
                        st.write(f"Page {page_num}: No voter boxes found (header/info page).")

            status.update(label="Extraction Complete!", state="complete", expanded=False)

        st.success(f"Successfully extracted {total_voters} voter boxes into `{VOTER_CROPS_DIR}`.")
        
# ==========================================
# STAGE 2: COORDINATE VERIFICATION
# ==========================================
if os.path.exists(VOTER_CROPS_DIR) and os.listdir(VOTER_CROPS_DIR):
    st.divider()
    st.header("🔍 Stage 2: OCR Zone Verification")
    st.markdown("Verify if the extraction zones are correctly aligned before processing all records.")
    
    voter_files = sorted(os.listdir(VOTER_CROPS_DIR))
    sample_file = st.selectbox("Select a voter box to verify:", voter_files)
    
    if sample_file:
        from core.ocr_engine import OCREngine
        import cv2
        
        engine = OCREngine()
        img_path = os.path.join(VOTER_CROPS_DIR, sample_file)
        img = cv2.imread(img_path)
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.subheader("Mapped Zones")
            overlay_img = engine.get_overlay_image(img)
            st.image(overlay_img, use_container_width=True, caption="Red: Serial | Green: EPIC | Blue: Malayalam Text")
        
        with col2:
            st.subheader("Instant OCR Run")
            if st.button("Run OCR on this Box"):
                from core.parser import VoterParser
                parser = VoterParser()
                
                with st.spinner("Reading & Parsing..."):
                    raw_data = engine.extract_raw_data(img)
                    
                    st.write("**Raw Extraction:**")
                    st.json({"Serial": raw_data["A_SERIAL"], "EPIC": raw_data["B_EPIC"]})
                    
                    cleaned_text = parser.clean_text(raw_data["C_TEXT"])
                    with st.expander("Show Cleaned Text Block"):
                        st.code(cleaned_text)

                    st.write("**Parsed Voter Information:**")
                    parsed_info = parser.parse_text_block(cleaned_text)
                    
                    # Display as a table for better readability
                    import pandas as pd
                    df = pd.DataFrame(list(parsed_info.items()), columns=["Field", "Value"])
                    st.table(df)
                    
                    st.info("Verify if the table values correctly match the image on the left.")

# ==========================================
# STAGE 3: BULK PROCESSING HUB
# ==========================================
if os.path.exists(VOTER_CROPS_DIR) and os.listdir(VOTER_CROPS_DIR):
    st.divider()
    st.header("🚀 Stage 3: Bulk Processing Hub")
    st.markdown("Run OCR and Integrity Shield on all extracted boxes.")

    from core.batch_processor import BatchProcessor
    batch_proc = BatchProcessor()

    # Session state for batch results
    if "batch_data" not in st.session_state:
        st.session_state.batch_data = batch_proc.load_progress()

    col1, col2 = st.columns([1, 1])

    with col1:
        if st.button("▶️ Start Full Bulk Process"):
            voter_files = sorted(os.listdir(VOTER_CROPS_DIR))
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            new_results = []
            for i, filename in enumerate(voter_files):
                expected_serial = i + 1
                status_text.text(f"Processing Record {expected_serial} of {len(voter_files)}...")
                
                img_path = os.path.join(VOTER_CROPS_DIR, filename)
                res = batch_proc.process_box(img_path, expected_serial)
                new_results.append(res)
                
                progress_bar.progress((i + 1) / len(voter_files))
            
            st.session_state.batch_data = new_results
            batch_proc.save_progress(new_results)
            st.success("Bulk Processing Complete!")

    with col2:
        if st.session_state.batch_data:
            df_full = pd.DataFrame(st.session_state.batch_data)
            flagged_count = len(df_full[df_full["Status"] == "⚠️ REVIEW"])
            st.metric("Flagged Records", flagged_count)
            
            if st.button("🗑️ Reset Batch Results"):
                st.session_state.batch_data = []
                if os.path.exists("data/batch_results.json"):
                    os.remove("data/batch_results.json")
                st.rerun()

    # --- REVIEW STATION ---
    if st.session_state.batch_data:
        st.subheader("📊 Review & Correction Station")
        
        tab1, tab2 = st.tabs(["⚠️ Flagged for Review", "✅ Clean Records"])
        
        with tab1:
            df_flagged = pd.DataFrame([r for r in st.session_state.batch_data if r["Status"] == "⚠️ REVIEW"])
            if not df_flagged.empty:
                st.warning(f"Found {len(df_flagged)} items requiring manual verification.")
                
                # Selection for manual fix
                target_filename = st.selectbox("Select flagged record to fix:", df_flagged["Filename"].tolist())
                
                if target_filename:
                    # Find the specific record
                    idx = next(i for i, r in enumerate(st.session_state.batch_data) if r["Filename"] == target_filename)
                    curr_record = st.session_state.batch_data[idx]
                    
                    c1, c2 = st.columns([1, 1])
                    with c1:
                        st.image(curr_record["Image_Path"], caption="Voter Box Crop")
                        st.error(f"Flags: {curr_record['Flags']}")
                    
                    with c2:
                        st.write("**Manual Correction Form**")
                        # Essential fields with unique keys to prevent ghosting
                        edited_name = st.text_input("Name", curr_record.get("Full Name", ""), key=f"name_{target_filename}")
                        edited_epic = st.text_input("EPIC ID", curr_record.get("EPIC_ID", ""), key=f"epic_{target_filename}")
                        
                        col_a, col_b = st.columns(2)
                        with col_a:
                            rel_options = ["Father", "Husband", "Mother", "Others", "N/A"]
                            curr_rel = curr_record.get("Relation Type", "Father")
                            if curr_rel not in rel_options: curr_rel = "N/A"
                            edited_rel_type = st.selectbox("Relation Type", rel_options, 
                                                        index=rel_options.index(curr_rel),
                                                        key=f"rel_{target_filename}")
                        with col_b:
                            edited_rel_name = st.text_input("Relation Name", curr_record.get("Relation Name", ""), key=f"rel_name_{target_filename}")
                        
                        col_h1, col_h2 = st.columns(2)
                        with col_h1:
                            edited_house_num = st.text_input("House Number", curr_record.get("House Number", ""), key=f"h_num_{target_filename}")
                        with col_h2:
                            edited_house_name = st.text_input("House Name", curr_record.get("House Name", ""), key=f"h_name_{target_filename}")
                        
                        col_c, col_d = st.columns(2)
                        with col_c:
                            edited_age = st.text_input("Age", curr_record.get("Age", ""), key=f"age_{target_filename}")
                        with col_d:
                            edited_gender = st.selectbox("Gender", ["Male", "Female", "N/A"],
                                                      index=["Male", "Female", "N/A"].index(curr_record.get("Gender", "Male") if curr_record.get("Gender") in ["Male", "Female"] else "N/A"),
                                                      key=f"gender_{target_filename}")
                        
                        if st.button("Save Correction"):
                            # Update Malayalam fields
                            st.session_state.batch_data[idx].update({
                                "Full Name": edited_name,
                                "EPIC_ID": edited_epic,
                                "Relation Type": edited_rel_type,
                                "Relation Name": edited_rel_name,
                                "House Number": edited_house_num,
                                "House Name": edited_house_name,
                                "Age": edited_age,
                                "Gender": edited_gender,
                                "Status": "✅ OK",
                                "Flags": ""
                            })
                            
                            batch_proc.save_progress(st.session_state.batch_data)
                            st.success("Record updated!")
                            st.rerun()
                
                st.dataframe(df_flagged[["Filename", "Serial_OCR", "EPIC_ID", "Full Name", "Flags"]], use_container_width=True)
            else:
                st.success("No flagged records! All items are clean.")

        with tab2:
            df_clean = pd.DataFrame([r for r in st.session_state.batch_data if r["Status"] == "✅ OK"])
            if not df_clean.empty:
                # Show primary Malayalam fields
                display_cols = [
                    "Serial_OCR", "EPIC_ID", 
                    "Full Name", "Relation Name",
                    "House Number", "House Name",
                    "Age", "Gender"
                ]
                st.dataframe(df_clean[display_cols], use_container_width=True)
            else:
                st.info("No clean records yet.")

        # FINAL EXPORT
        st.divider()
        st.subheader("Final Data Export")
        
        # Database Section
        # Connect to Django Bridge
        from core.db_bridge import get_constituencies, save_booth_data
        
        try:
            constituency_list = get_constituencies()
        except:
            constituency_list = ["Error connecting to DB"]
            
        c1, c2, c3 = st.columns([1, 1, 1])
        with c1:
            target_constituency = st.selectbox("Select Constituency", constituency_list)
        with c2:
            target_booth = st.number_input("Booth Number", min_value=1, step=1)
        with c3:
            st.write("") # Spacer
            st.write("") # Spacer
            if st.button("💾 Save to PostgreSQL Database"):
                if target_constituency == "Error connecting to DB" or not constituency_list:
                    st.error("Cannot save: Database connection failed or no constituencies found.")
                else:
                    with st.spinner("Saving to Database..."):
                        # Get original filename if possible, else generic
                        orig_file = "Unknown_PDF"
                        if os.path.exists(UPLOAD_DIR) and os.listdir(UPLOAD_DIR):
                            orig_file = os.listdir(UPLOAD_DIR)[0]
                            
                        success, msg = save_booth_data(
                            target_constituency, 
                            target_booth, 
                            st.session_state.batch_data,
                            orig_file
                        )
                        
                        if success:
                            st.success(msg)
                            st.balloons()
                        else:
                            st.error(msg)

        # CSV Export (Legacy)
        with st.expander("Show CSV Download Option"):
            if st.button("Generate CSV"):
                df_final = pd.DataFrame(st.session_state.batch_data)
                csv_path = "data/voters_final_export.csv"
                df_final.to_csv(csv_path, index=False, encoding='utf-8-sig')
                
                with open(csv_path, "rb") as f:
                    st.download_button(
                        label="Download CSV File",
                        data=f,
                        file_name="voters_export.csv",
                        mime="text/csv"
                    )

st.divider()
st.caption("Automated Voter Digitization Pipeline - v1.0")
