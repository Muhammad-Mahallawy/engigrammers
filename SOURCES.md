# NASA evidence used in FLOWTRACE

The frontend consumes the supplied FastAPI responses; it does not fabricate records or add measurements from unrelated sources. The unchanged backend CSV contains 56 rows, including 31 SIBAL fabric rows, and all rows currently have source ID `bass2-summary`. Individual PDF page fields are preserved as supplied; they have not been independently audited against the original report pages.

The NASA Technical Reports Server identifies document 20210011385 as **Burning and Suppression of Solids–II (BASS-II) Summary Report**, published October 1, 2021. The abstract identifies ambient oxygen, ventilation flow, fuel type, thickness, and geometry as experimental variables. Citation: https://ntrs.nasa.gov/citations/20210011385 . Original PDF: https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf . Retrieved November 14, 2026.

The NASA Technical Reports Server identifies document 20160000593 as **Combustion of Solids in Microgravity: Results from the BASS-II Experiment**, a presentation published October 23, 2014. It describes opposed/concurrent flows and the effects studied in the BASS-II apparatus. This is contextual reading, not the source of additional numerical records in this frontend. Citation: https://ntrs.nasa.gov/citations/20160000593 . Retrieved November 14, 2026.

All numerical chart axes retain the backend's units: flow in cm/s, oxygen in vol%, pressure in kPa, and sample dimensions in mm. Unknown outcomes are not classified as sustained or extinguished. Plotted relationships are descriptive and do not establish causation or a universal survival threshold.

## Pressure range parsing limitation

The supplied CSV's PMMA records B1–B22 (IDs `bass2-B1` through `bass2-B22`) contain the recorded pressure text `99.2-99.5` kPa. The unchanged backend parses this field with `float()` and therefore returns null for these ranges, as well as for genuinely blank values. The frontend does not modify the API or turn ranges into a mean. It displays the verified range from the supplied CSV as explicitly labelled source context for these exact records. Detail and comparison views explain that the numeric API field is unavailable; pressure deltas remain unavailable. CSV export retains the API null in `pressure_kpa` and places the provenance range in the separate `source_csv_pressure_range_kpa` column. This annotation is tied to the uploaded source CSV, not a newly inferred or live numerical measurement.

## Orbital visual redesign

The user-supplied `template2.png` and `template.webp` guided visual style only. Their logos, content, and scientific/satellite figures were not reused. Original generated artwork at `client/public/space-orbit.webp` depicts a cinematic blue Earth and rocky meteorite-inspired space fragments. The image and animated meteor streaks are purely decorative; they are not experimental photographs, NASA visualizations, orbit measurements, meteorite observations, or scientific evidence.
