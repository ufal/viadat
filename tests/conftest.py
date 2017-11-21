
import os.path
import sys
import pytest

VIADAT_TESTS_DIR = os.path.dirname(__file__)
VIADAT_TEST_DATA_DIR = os.path.join(VIADAT_TESTS_DIR, "data")
VIADAT_ROOT_DIR = os.path.dirname(VIADAT_TESTS_DIR)
VIADAT_BACKEND_DIR = os.path.join(VIADAT_ROOT_DIR)

sys.path.insert(0, VIADAT_BACKEND_DIR)


@pytest.fixture()
def test_files():
    return {
        "doc1": os.path.join(VIADAT_TEST_DATA_DIR, "doc1.doc"),
        "doc2": os.path.join(VIADAT_TEST_DATA_DIR, "doc2.doc"),
        "doc3": os.path.join(VIADAT_TEST_DATA_DIR, "doc3.doc"),
        "doc4": os.path.join(VIADAT_TEST_DATA_DIR, "doc4.doc"),
        "doc5": os.path.join(VIADAT_TEST_DATA_DIR, "doc5.doc"),
        "audio4": os.path.join(VIADAT_TEST_DATA_DIR, "audio4.mp3"),
    }
