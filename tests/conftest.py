
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

@pytest.fixture()
def headers():
    return {
        "doc1": {
            "PŘEPIS ROZHOVORU": "JANČÁŘ, JOSEF (ETN-34-1)",
            "Signatura": "ETN-34-1",
            "Jméno a příjmení narátora/ky": "PhDr. Josef Jančář, CSc. (JJ)",
            "Ročník narození": "1931",
            "Datum rozhovoru": "26. 7. 2016",
            "Místo rozhovoru": "Uherské Hradiště",
            "Jméno a příjmení tazatele/ky": "Jiří Hlaváček (JH)",
            "Délka rozhovoru": "00:32:49",
            "Počet stran přepisu": "7",
            "Projekt": "Mezi státním plánem a badatelskou svobodou. Etnografie a folkloristika v českých zemích v kontextu vývoje kultury a společnosti v letech 1945–1989 (GA ČR 15-03754S).",
            "Informovaný souhlas": "bez dalších ujednání",
        },
        "doc2": {
            "Číslo": "ETN-25-1",
            "Narátor": "PhDr. Helena AbcXyz",
            "Datum": "2. 10. 2015",
            "Tazatel": "Jiří Ggggg",
            "Místo": "Brno",
        },
        "doc3": {

        },
        "doc4": {
            #Mozna nadpis Parlament České republiky, Poslanecká sněmovna ???
            "Popis": "39. schůze; Úterý 9. února 2016",
        },
    }
