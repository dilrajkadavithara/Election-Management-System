"""
Malayalam Unicode Normalization
Converts composite forms to modern atomic chillu forms
"""

def normalize_malayalam(text):
    """
    Normalize Malayalam text to use atomic chillu characters.
    Converts composite forms (consonant + virama) to single chillu characters
    ONLY when they appear at word boundaries (end of word or before space).
    Preserves conjunct consonants like ന്ധ, ന്ത, etc.
    """
    if not text or text == "N/A":
        return text
    
    import re
    
    # 1. Global Safe Chillu Forms
    # ONLY 'Ra' (ര്) is safe to replace globally because it doesn't form geminates via Virama.
    # Replacing 'La', 'Lla', 'Nna' etc globally breaks geminates like 'Alla' (ല്ല), 'Ellam' (ള്ള), 'Mannu' (ണ്ണ).
    global_safe_chillus = {
        'ര്': 'ർ',  # RA + Virama -> Chillu R (Fixes 'Poonarth', 'Arjun' etc)
    }
    
    normalized = text
    
    # Apply Global Safe Replacement first
    for composite, atomic in global_safe_chillus.items():
        normalized = normalized.replace(composite, atomic)

    # 2. Sensitive Chillu Forms (Restricted to Boundaries)
    # These form critical conjuncts (ligatures) inside words.
    sensitive_map = {
        'ന്': 'ൻ',  # NA + Virama -> Chillu N (Protects 'Sindhu' ന്ധ, 'Nandan' ന്ദ)
        'ല്': 'ൽ',  # LA + Virama -> Chillu L (Protects 'Nalla' ല്ല, 'Palli' ല്ലി)
        'ള': 'ൾ',   # LLA + Virama -> Chillu LL (Note: Some fonts use ള)
        'ള്': 'ൾ',  # LLA + Virama -> Chillu LL (Protects 'Vellam' ള്ള, 'Pallipparambil' ള്ളി)
        'ണ്': 'ൺ',  # NNA + Virama -> Chillu NN (Protects 'Mannu' ണ്ണ)
        'ക്': 'ൿ',  # KA + Virama -> Chillu K (Protects 'Kakka' ക്ക)
    }
    
    for composite, atomic in sensitive_map.items():
        # Replace at end of string
        normalized = re.sub(f'{re.escape(composite)}$', atomic, normalized)
        # Replace before space
        normalized = re.sub(f'{re.escape(composite)}(?=\\s)', atomic, normalized)
        # Replace before punctuation
        normalized = re.sub(f'{re.escape(composite)}(?=[.,!?])', atomic, normalized)

    # Specific Post-Correction (Legacy Cleanup)
    normalized = normalized.replace("പൂണര്ത", "പൂണർത") # Redundant now but safe to keep

    return normalized
