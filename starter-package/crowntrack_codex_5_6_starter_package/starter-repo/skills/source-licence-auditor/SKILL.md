---
name: source-licence-auditor
description: Source and licence audit workflow. Use whenever adding or evaluating trail/map/geospatial data sources, attribution, offline rights, or legal confidence.
---


# source-licence-auditor

## Purpose

Prevent unsafe or illegal data-source choices.

## Workflow

1. Identify the proposed data source.
2. Confirm licence and offline use rights from primary documentation where possible.
3. Record attribution requirements.
4. Classify offline use as yes/no/unknown/licensed-only.
5. If uncertain, mark unknown and block production use.

## Hard no

- No scraping paid/proprietary sources.
- No bulk public OSM tile downloading.
- No guessing legal riding permission from map geometry.

## Output

A source audit entry with source name, URL, licence, offline use, attribution, confidence, and notes.
