# Engigrammers — Flame in Freefall

**Engigrammers** is a six-person team participating in the **NASA Space Apps
Challenge 2026**. Our challenge is **[Flame in Freefall: AI-Powered Fire Safety
Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/)**.

## About the challenge

NASA has collected decades of research about how flames behave in microgravity.
This research is important for fire safety during future human space missions,
but the large amount of experimental data can be difficult to search, compare,
and interpret.

The challenge asks teams to build an interactive AI- or SI-powered tool that
turns NASA's microgravity-combustion research into useful fire-safety insights.
The tool should help users understand flame behavior under different conditions,
compare experiments, identify evidence gaps, and make the results easier for
researchers and engineers to use.

## Our project

We are building an easy-to-use dashboard for fire-safety planning in Moon and
Mars habitats. A user will choose a habitat scenario, such as a Moon base with
a specific oxygen level, pressure, gravity, or airflow. The dashboard will then
show:

- which NASA experiments are relevant;
- how closely each experiment matches the chosen scenario;
- what each experiment found;
- where NASA data is missing; and
- the source behind every important claim.

## Project status

This repository is currently in the **data preparation stage**. It contains
experimental tables from NASA Physical Sciences Informatics (PSI). The dashboard,
ranking system, and AI explanations will be added as the project develops.

## Data in this repository

All datasets are stored in the [`data/`](./data) directory.

| Investigation | Experiment | File |
|---|---|---|
| PSI-10 | Flame Design - Inverse Flame | [`data/PSI-10/PSI-10_Experimental table_Flame Design_Inverse Flame.csv`](./data/PSI-10/PSI-10_Experimental%20table_Flame%20Design_Inverse%20Flame.csv) |
| PSI-10 | Flame Design - Normal Flame | [`data/PSI-10/PSI-10_Experimental table_Flame Design_Normal Flame.csv`](./data/PSI-10/PSI-10_Experimental%20table_Flame%20Design_Normal%20Flame.csv) |
| PSI-98 | SAFFIRE-1 | [`data/PSI-98/PSI-98_Experimental table_SAFFIRE-1.csv`](./data/PSI-98/PSI-98_Experimental%20table_SAFFIRE-1.csv) |
| PSI-159 | CFI-G - Inverse Flames | [`data/PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv`](./data/PSI-159/PSI-159_Experimental%20table_CFI-G_Inverse%20Flames.csv) |
| PSI-159 | CFI-G - Normal Flames | [`data/PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv`](./data/PSI-159/PSI-159_Experimental%20table_CFI-G_Normal%20Flames.csv) |

### What the tables contain

The columns vary by investigation. Depending on the file, they include:

- flame type and fuel;
- oxygen concentration;
- pressure;
- fuel, oxygen, nitrogen, and total flow rates;
- ignition and burn time;
- flame temperature;
- material and sample dimensions; and
- experiment comments and observations.

Some cells contain text such as `RAMPED`, `-`, or `~21.5` instead of a plain
number. Empty cells also occur. Data-processing code must handle these values
carefully and should not silently convert them into incorrect measurements.

## Getting started

Clone the repository:

```bash
git clone https://github.com/Muhammad-Mahallawy/engigrammers.git
cd engigrammers
```

You can open the CSV files directly in Excel, Google Sheets, or any text editor.
To inspect them with Python:

```bash
python -m pip install pandas
python -c "import pandas as pd; print(pd.read_csv('data/PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv').head())"
```

## Planned features

1. A searchable catalogue of NASA PSI investigations.
2. Habitat scenario presets and adjustable conditions.
3. Code-based experiment ranking.
4. A coverage view showing where experimental data exists or is missing.
5. Short, source-linked explanations of why an experiment matters.
6. Downloadable cleaned data and simple baseline models.

The ranking will be calculated by code. AI will only explain the results using
the source material and will not replace the underlying calculations.

## Data and AI principles

- Use NASA PSI and NASA Technical Reports Server (NTRS) data.
- Link claims to their original NASA source.
- Clearly disclose AI-assisted content.

## Contributing

When adding or changing data:

1. Keep the original source file name when possible.
2. Put each investigation in its own folder under [`data/`](./data).
3. Record the NASA source and any cleaning steps.
4. Do not overwrite original measurements with guessed values.
5. Explain unknown or missing values instead of hiding them.

See [`HANDOFF.md`](./HANDOFF.md) for the current project decisions, milestones,
and questions.

## Team

This project is being developed by the **Engigrammers team**, a team of **six
people**, for NASA Space Apps 2026 in Cairo.
