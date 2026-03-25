"""
Tests for the DailyProgress snapshot task and the new DIGITIZED_Q definition.

Covers:
  - DIGITIZED_Q: voter is digitized only when all 4 fields are present
  - snapshot_daily_progress: creates DailyProgress records per booth
  - Delta calculation: new_digitized computed from yesterday's snapshot
  - is_digitized sync on voter edit
"""
import pytest
from datetime import date, timedelta


@pytest.mark.django_db
class TestDigitizedDefinition:
    """Test that DIGITIZED_Q requires all 4 fields: phone, leaning, location, probability."""

    def _create_booth(self) -> "Booth":
        from core_db.models import Constituency, Booth
        c, _ = Constituency.objects.get_or_create(name="TestConst")
        b, _ = Booth.objects.get_or_create(constituency=c, number="T01")
        return b

    def _create_voter(self, booth: "Booth", serial: int, **overrides) -> "Voter":
        from core_db.models import Voter
        defaults = {
            "booth": booth,
            "serial_no": serial,
            "epic_id": f"TST{serial:07d}",
            "full_name": f"Test Voter {serial}",
            "source_file": "test.pdf",
        }
        defaults.update(overrides)
        return Voter.objects.create(**defaults)

    def test_voter_with_all_4_fields_is_digitized(self):
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        self._create_voter(b, 1,
            phone_no="9876543210",
            voter_leaning="UDF",
            current_location="LOCAL",
            voting_probability="CONFIRMED",
        )

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 1

    def test_voter_missing_phone_is_not_digitized(self):
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        self._create_voter(b, 2,
            phone_no="",  # missing
            voter_leaning="LDF",
            current_location="LOCAL",
            voting_probability="LIKELY",
        )

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 0

    def test_voter_missing_leaning_is_not_digitized(self):
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        self._create_voter(b, 3,
            phone_no="9876543210",
            voter_leaning=None,  # missing
            current_location="LOCAL",
            voting_probability="CONFIRMED",
        )

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 0

    def test_voter_missing_location_is_not_digitized(self):
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        self._create_voter(b, 4,
            phone_no="9876543210",
            voter_leaning="NDA",
            current_location="",  # missing
            voting_probability="UNLIKELY",
        )

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 0

    def test_voter_missing_probability_is_not_digitized(self):
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        self._create_voter(b, 5,
            phone_no="9876543210",
            voter_leaning="NEUTRAL",
            current_location="ABROAD",
            voting_probability=None,  # missing
        )

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 0

    def test_only_fully_filled_voters_counted(self):
        """Mix of complete and incomplete voters — only complete ones count."""
        from django.db.models import Count
        from core.db_bridge import DIGITIZED_Q
        from core_db.models import Voter

        b = self._create_booth()
        full_fields = dict(phone_no="1234567890", voter_leaning="UDF",
                           current_location="LOCAL", voting_probability="CONFIRMED")

        self._create_voter(b, 10, **full_fields)  # digitized
        self._create_voter(b, 11, **full_fields)  # digitized
        self._create_voter(b, 12, phone_no="", voter_leaning="LDF",
                           current_location="LOCAL", voting_probability="LIKELY")  # not
        self._create_voter(b, 13)  # not — all fields empty

        count = Voter.objects.filter(booth=b).aggregate(
            digitized=Count('id', filter=DIGITIZED_Q)
        )['digitized']
        assert count == 2


@pytest.mark.django_db
class TestSnapshotDailyProgress:
    """Test the snapshot_daily_progress Celery task."""

    def _setup_booth_with_voters(self) -> "Booth":
        from core_db.models import Constituency, Booth, Voter

        c, _ = Constituency.objects.get_or_create(name="SnapshotTestConst")
        b, _ = Booth.objects.get_or_create(constituency=c, number="S01")

        # 3 fully digitized voters (UDF, LDF, NDA)
        for i, leaning in enumerate(["UDF", "LDF", "NDA"], start=1):
            Voter.objects.create(
                booth=b, serial_no=i, epic_id=f"SNAP{i:05d}",
                full_name=f"Snap Voter {i}", source_file="snap.pdf",
                phone_no=f"900000000{i}", voter_leaning=leaning,
                current_location="LOCAL", voting_probability="CONFIRMED",
            )
        # 1 incomplete voter (not digitized)
        Voter.objects.create(
            booth=b, serial_no=4, epic_id="SNAP00004",
            full_name="Incomplete Voter", source_file="snap.pdf",
            phone_no="", voter_leaning="NEUTRAL",
            current_location="LOCAL", voting_probability="",
        )
        return b

    def test_creates_daily_progress_records(self):
        from core_db.models import DailyProgress
        from backend.tasks import snapshot_daily_progress

        b = self._setup_booth_with_voters()
        result = snapshot_daily_progress()

        assert "Snapshot complete" in result

        dp = DailyProgress.objects.get(booth=b, date=date.today())
        assert dp.digitized_total == 3  # only fully digitized
        assert dp.udf_total == 1
        assert dp.ldf_total == 1
        assert dp.nda_total == 1
        assert dp.neutral_total == 1  # leaning totals count all voters with that leaning

    def test_delta_from_yesterday(self):
        from core_db.models import DailyProgress, Voter
        from backend.tasks import snapshot_daily_progress

        b = self._setup_booth_with_voters()

        # Simulate yesterday's snapshot
        yesterday = date.today() - timedelta(days=1)
        DailyProgress.objects.create(
            booth=b, date=yesterday,
            digitized_total=1, udf_total=1, ldf_total=0,
            nda_total=0, neutral_total=0,
            new_digitized=1, new_udf=1, new_ldf=0, new_nda=0,
            winning_chance=0.5,
        )

        snapshot_daily_progress()

        dp = DailyProgress.objects.get(booth=b, date=date.today())
        # Today: 3 digitized, yesterday: 1 → delta = 2
        assert dp.new_digitized == 2
        assert dp.new_udf == 0  # 1 today - 1 yesterday = 0
        assert dp.new_ldf == 1  # 1 today - 0 yesterday = 1
        assert dp.new_nda == 1  # 1 today - 0 yesterday = 1

    def test_idempotent_rerun(self):
        """Running twice on the same day should update, not duplicate."""
        from core_db.models import DailyProgress
        from backend.tasks import snapshot_daily_progress

        self._setup_booth_with_voters()

        snapshot_daily_progress()
        snapshot_daily_progress()

        count = DailyProgress.objects.filter(date=date.today()).count()
        assert count == 1  # update_or_create, not duplicate

    def test_winning_chance_calculated(self):
        from core_db.models import DailyProgress
        from backend.tasks import snapshot_daily_progress

        b = self._setup_booth_with_voters()
        snapshot_daily_progress()

        dp = DailyProgress.objects.get(booth=b, date=date.today())
        # 3 digitized, max party = 1 → winning_chance = 1/3 ≈ 0.3333
        assert 0.0 < dp.winning_chance <= 1.0
        assert abs(dp.winning_chance - round(1 / 3, 4)) < 0.01

    def test_empty_booth_no_crash(self):
        """A booth with no voters should not crash the task."""
        from core_db.models import Constituency, Booth, DailyProgress
        from backend.tasks import snapshot_daily_progress

        c, _ = Constituency.objects.get_or_create(name="EmptyConst")
        Booth.objects.get_or_create(constituency=c, number="E01")

        result = snapshot_daily_progress()
        assert "Snapshot complete" in result


@pytest.mark.django_db
class TestIsDigitizedSync:
    """Test that is_digitized is updated when a voter is edited."""

    def test_voter_becomes_digitized_after_full_update(self):
        from core_db.models import Constituency, Booth, Voter
        from core.db_bridge import update_voter_in_db

        c, _ = Constituency.objects.get_or_create(name="SyncConst")
        b, _ = Booth.objects.get_or_create(constituency=c, number="Y01")
        v = Voter.objects.create(
            booth=b, serial_no=1, epic_id="SYNC001",
            full_name="Sync Voter", source_file="sync.pdf",
        )
        assert v.is_digitized is False

        success, _ = update_voter_in_db(v.id, {
            "phone_no": "9999999999",
            "voter_leaning": "UDF",
            "current_location": "LOCAL",
            "voting_probability": "CONFIRMED",
        })
        assert success is True

        v.refresh_from_db()
        assert v.is_digitized is True

    def test_voter_not_digitized_with_partial_update(self):
        from core_db.models import Constituency, Booth, Voter
        from core.db_bridge import update_voter_in_db

        c, _ = Constituency.objects.get_or_create(name="SyncConst2")
        b, _ = Booth.objects.get_or_create(constituency=c, number="Y02")
        v = Voter.objects.create(
            booth=b, serial_no=1, epic_id="SYNC002",
            full_name="Partial Voter", source_file="sync.pdf",
        )

        # Only set 2 of 4 fields
        success, _ = update_voter_in_db(v.id, {
            "phone_no": "9999999999",
            "voter_leaning": "LDF",
        })
        assert success is True

        v.refresh_from_db()
        assert v.is_digitized is False
