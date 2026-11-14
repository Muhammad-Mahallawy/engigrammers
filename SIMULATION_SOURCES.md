# Simulation source findings

These sources provide research context for FLOWTRACE's educational simulation. They do not validate its normalized browser model, calibrate its constants, or turn its outputs into NASA measurements.

## BASS-II experimental context

NASA NTRS, https://ntrs.nasa.gov/citations/20160000593 (accessed 14 November 2026): BASS-II used thin/thick flat samples, acrylic slabs, spheres, and cylinders in a wind tunnel aboard the ISS. The abstract reports flow speeds up to 53 cm/s, opposed/concurrent configurations, and sensitivity to ventilation in the 0–5 cm/s range. Some reported flames could persist below 1 cm/s and flare up when airflow increased. These are experiment-specific observations, not universal thresholds or calibration of the browser model.

## Challenge context

Official challenge page: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ (accessed 14 November 2026). The challenge asks for a web-based SI-powered dashboard that summarizes, ranks, and interprets combustion investigations. Extracting data that supports predictive modeling is an optional user capability, not a provided universal simulator or a demand to invent material flammability predictions. The page discusses absent buoyancy, oxygen/airflow dependence, and solid materials such as fabrics/plastics; it excludes rocket/propellant fire safety from the PSI research scope and says partial-gravity combustion data is currently unavailable in PSI. Intermediate-buoyancy controls must therefore be labelled exploratory, not NASA-validated lunar/Martian predictions.

## NASA Science and SoFIE

NASA Science, https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/ (4 October 2024; accessed 14 November 2026): terrestrial candle shape is driven by buoyant circulation, while the article illustrates a spherical microgravity candle flame. It describes CIR, SoFIE, and Saffire; it does not give a browser-ready universal combustion model or material-specific calibration.

NASA SVS, https://svs.gsfc.nasa.gov/31394/ (6 May 2026; accessed 14 November 2026): the SoFIE thin-fabric illustration describes fuel-vaporization-induced flow even in a quiescent microgravity chamber and repeated brightening/dimming with oxygen/fuel transport. Therefore, “all microgravity flames are spherical” would be wrong, and a simplified 2D point-source transport demonstration must not be presented as a reproduction of BASS/SIBAL solid-fuel experiments. Any normalized model activity or flame colors are synthetic outputs, not measured heat release, temperature, or soot values.
