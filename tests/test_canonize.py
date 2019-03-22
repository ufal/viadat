
from backend.modules.text.analyze import canonize_tag

def test_canonize_geo_tag():
    assert canonize_tag("Praha") == ["Praha"]
    assert canonize_tag("Prahou") == ["Praha"]
    assert canonize_tag("České republiky") == ["Česká republika"]
    assert canonize_tag("České republice") == ["Česká republika"]
    assert canonize_tag("Ústím nad Labem") == ["Ústí nad Labem"]

def test_canonize_name_tag():
    assert canonize_tag("Miladu Horakovou") == ["Milada Horakova"]
    assert "Jan Masaryk" in canonize_tag("Janem Masarykem")

def test_canonize_2():
    assert canonize_tag("Novej Mlýn") == ["Nový Mlýn"]

def test_canonize_3():
    assert canonize_tag("Ameriky") == ["Amerika"]
