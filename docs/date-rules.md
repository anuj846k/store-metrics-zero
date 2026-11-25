# Date rules

This file tells how to change a date phrase from the store owner into an exact date range.
Each metric function takes this range as `start` and `end`.

## Fixed today for this dataset

`data/order-history.csv` ends on 2025-10-27. For this dataset, "today" is fixed at Tuesday, 2025-10-28.
Thus "last week" is 2025-10-20 to 2025-10-26, and "this month" is 2025-10-01 to 2025-10-28.
The example table below uses a different today (2026-11-25) to show each rule.

## General rules

1. A range includes the start date and the end date.
2. "Today" is the current date in the store time zone. Do not use UTC.
3. A week starts on Monday and ends on Sunday.
4. A month and a year are calendar periods.
5. A quarter is a calendar quarter: Q1 is January to March, Q2 is April to June, Q3 is July to September, Q4 is October to December.
6. "This" means from the first day of the current period to today. Today is not complete, so the numbers for today can change.
7. "Last" and "previous" have the same meaning. They mean the full period before the current period.
8. "Last N days" means the N full days before today. It does not include today.
9. Always tell the owner the exact dates of the range in the answer.

## Ranges

Example: today is Wednesday, 2026-11-25.

| Owner says | Rule | Start | End |
|---|---|---|---|
| today | today | 2026-11-25 | 2026-11-25 |
| yesterday | today - 1 day | 2026-11-24 | 2026-11-24 |
| this week | Monday of this week to today | 2026-11-23 | 2026-11-25 |
| last week, previous week | Monday to Sunday of the week before this week | 2026-11-16 | 2026-11-22 |
| last 7 days | today - 7 days to today - 1 day | 2026-11-18 | 2026-11-24 |
| last 30 days | today - 30 days to today - 1 day | 2026-10-26 | 2026-11-24 |
| this month | first day of this month to today | 2026-11-01 | 2026-11-25 |
| last month, previous month | first day to last day of the month before this month | 2026-10-01 | 2026-10-31 |
| this quarter | first day of this quarter to today | 2026-10-01 | 2026-11-25 |
| last quarter | first day to last day of the quarter before this quarter | 2026-07-01 | 2026-09-30 |
| this year | 1 January of this year to today | 2026-01-01 | 2026-11-25 |
| last year | 1 January to 31 December of the year before this year | 2025-01-01 | 2025-12-31 |
| in October (no year) | the full month, in the most recent October that started | 2026-10-01 | 2026-10-31 |
| in October 2025 | the full month in the given year | 2025-10-01 | 2025-10-31 |
| since 15 October | the given date to today | 2026-10-15 | 2026-11-25 |
| no date | use "last 30 days" | 2026-10-26 | 2026-11-24 |

## Comparisons

When the owner asks to compare with the previous period, use a period of the same type:

| Owner says | Current range | Compare with |
|---|---|---|
| this month vs last month | 2026-11-01 to 2026-11-25 | 2026-10-01 to 2026-10-25 |
| last week vs the week before | 2026-11-16 to 2026-11-22 | 2026-11-09 to 2026-11-15 |
| last 7 days vs the 7 days before | 2026-11-18 to 2026-11-24 | 2026-11-11 to 2026-11-17 |

For "this month vs last month", compare the same days of the month. Do not compare a part of a month with a full month.
If the previous month is shorter, use its last day. Example: 2026-03-01 to 2026-03-31 compares with 2026-02-01 to 2026-02-28.

## Ranges with no data

`data/order-history.csv` has orders from 2025-05-06 to 2025-10-27 only.
If a range has no orders, tell the owner "There are no orders from <start> to <end>". Do not say "Your sales were 0".
Example: on 2026-11-25, "this month" has no orders in `data/order-history.csv`.
