import pytest


DSN_XML_FIXTURE = """<?xml version='1.0' encoding='utf-8'?>
<dsn>
  <station name="gdscc" friendlyName="Goldstone" timeUTC="1775160000000" timeZoneOffset="-25200000"/>
  <dish name="DSS14" azimuthAngle="270.5" elevationAngle="45.2" windSpeed="12" isMSPA="false" isArray="false" isDDOR="false" activity="tracking">
    <downSignal active="true" signalType="data" dataRate="2048000" frequency="8.4e9" band="X" power="-120.5" spacecraft="Orion" spacecraftID="-1024"/>
    <target name="Orion" id="-1024" uplegRange="65000" downlegRange="65000" rtlt="0.43"/>
  </dish>
  <dish name="DSS24" azimuthAngle="180.0" elevationAngle="30.0" windSpeed="8" isMSPA="false" isArray="false" isDDOR="false" activity="">
    <target name="DSN" id="99" uplegRange="-1" downlegRange="-1" rtlt="-1"/>
  </dish>
  <station name="cdscc" friendlyName="Canberra" timeUTC="1775160000000" timeZoneOffset="36000000"/>
  <dish name="DSS43" azimuthAngle="332.0" elevationAngle="72.0" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="Spacecraft Telemetry, Tracking, and Command">
    <downSignal active="true" signalType="data" dataRate="2000000" frequency="0" band="S" power="-98" spacecraft="EM2" spacecraftID="-24"/>
    <target name="EM2" id="24" uplegRange="18000" downlegRange="18000" rtlt="0.12"/>
  </dish>
  <dish name="DSS34" azimuthAngle="332.0" elevationAngle="72.0" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="tracking">
    <downSignal active="true" signalType="data" dataRate="512000" frequency="2.2e9" band="S" power="-130.0" spacecraft="Voyager1" spacecraftID="-31"/>
    <target name="Voyager1" id="-31" uplegRange="23000000000" downlegRange="23000000000" rtlt="153400"/>
  </dish>
</dsn>"""


def test_parse_dsn_xml():
    from tools.dsn import parse_dsn_xml
    stations = parse_dsn_xml(DSN_XML_FIXTURE)
    assert len(stations) == 2
    assert stations[0]["name"] == "Goldstone"
    assert stations[1]["name"] == "Canberra"


def test_parse_dsn_dishes():
    from tools.dsn import parse_dsn_xml
    stations = parse_dsn_xml(DSN_XML_FIXTURE)
    goldstone = stations[0]
    assert len(goldstone["dishes"]) == 2
    assert goldstone["dishes"][0]["name"] == "DSS14"
    assert len(goldstone["dishes"][0]["targets"]) == 1
    assert goldstone["dishes"][0]["targets"][0]["name"] == "Orion"


def test_parse_dsn_signals():
    from tools.dsn import parse_dsn_xml
    stations = parse_dsn_xml(DSN_XML_FIXTURE)
    dss14 = stations[0]["dishes"][0]
    assert len(dss14["signals"]) == 1
    assert dss14["signals"][0]["data_rate"] == "2048000"
    assert dss14["signals"][0]["band"] == "X"


def test_format_dsn_finds_artemis():
    from tools.dsn import parse_dsn_xml, format_dsn_status
    stations = parse_dsn_xml(DSN_XML_FIXTURE)
    output = format_dsn_status(stations)
    assert "Artemis II (EM2) is currently being tracked" in output
    # Should detect both "Orion" (Goldstone) and "EM2" (Canberra) as Artemis II
    assert "DSS14" in output
    assert "DSS43" in output


def test_format_dsn_shows_data_rate():
    from tools.dsn import parse_dsn_xml, format_dsn_status
    stations = parse_dsn_xml(DSN_XML_FIXTURE)
    output = format_dsn_status(stations)
    assert "Mb/s" in output or "kb/s" in output
