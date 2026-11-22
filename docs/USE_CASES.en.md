# Use cases and screenshots

[README](../README.en.md) | [日本語](USE_CASES.ja.md)

<!-- capture-status:start -->
Captured from real UI interactions on 2026-11-22T11:07:15.003Z, using Chromium 153.0.8010.12 and an isolated temporary SQLite database.
<!-- capture-status:end -->

## 01. Explore available desks

Start in Japanese and choose a date, time and area. The map shows available desks, occupied seats and fictional colleagues.

<!-- capture:01-ja-office-map.png:start -->
![日本語のオフィスマップ / Japanese office map](screenshots/01-ja-office-map.png)
<!-- capture:01-ja-office-map.png:end -->

## 02. Book from the map

Select available desk A02 and choose Book this desk. Review the option before confirming; selecting a desk alone does not save a booking.

<!-- capture:02-ja-map-selection.png:start -->
![座席を選び、候補を確認 / Select a desk](screenshots/02-ja-map-selection.png)
<!-- capture:02-ja-map-selection.png:end -->

## 03. Persist across reloads

Confirm a booking, reload the page, and open My bookings to verify the saved desk and time.

<!-- capture:03-ja-saved-booking.png:start -->
![保存と再読み込み / Persistent booking](screenshots/03-ja-saved-booking.png)
<!-- capture:03-ja-saved-booking.png:end -->

## 04. Reschedule a booking

Choose Reschedule and enter “Change to tomorrow afternoon”. Confirm the option and verify the updated 13:00–18:00 slot.

<!-- capture:04-ja-reschedule.png:start -->
![既存予約の日時を変更 / Reschedule](screenshots/04-ja-reschedule.png)
<!-- capture:04-ja-reschedule.png:end -->

## 05. Cancel a booking

Cancel the reservation from My bookings. The booking disappears and the slots become available again.

<!-- capture:05-ja-cancellation.png:start -->
![予約をキャンセル / Cancellation](screenshots/05-ja-cancellation.png)
<!-- capture:05-ja-cancellation.png:end -->

## 06. Find adjacent team desks

Ask for three adjacent desks next Wednesday, 09:00–18:00, for yourself, Tanaka and Sato, with monitors required and windows preferred. The proposal preserves required constraints when a window group is unavailable.

<!-- capture:06-ja-team-proposal.png:start -->
![自然言語で3人の隣接席を提案 / Adjacent team desks](screenshots/06-ja-team-proposal.png)
<!-- capture:06-ja-team-proposal.png:end -->

## 07. Recover from a conflict

Enable conflict simulation and confirm. The demo inserts a conflicting reservation, rolls back the group attempt and offers new available options.

<!-- capture:07-ja-conflict-recovery.png:start -->
![競合時に代替案を提案 / Conflict recovery](screenshots/07-ja-conflict-recovery.png)
<!-- capture:07-ja-conflict-recovery.png:end -->

## 08. Confirm the whole group

Confirm a replacement option and verify that all three desks and participant names are stored in one booking.

<!-- capture:08-ja-team-booking.png:start -->
![全員分をまとめて確定 / Atomic team booking](screenshots/08-ja-team-booking.png)
<!-- capture:08-ja-team-booking.png:end -->

## 09. Switch languages

Switch to English. Booking labels and names change, and the language preference persists after reload.

<!-- capture:09-en-bookings.png:start -->
![英語へ切り替え / English bookings](screenshots/09-en-bookings.png)
<!-- capture:09-en-bookings.png:end -->

## 10. Request a desk in English

Enter “Find a window desk with a monitor tomorrow morning” and review the English recommendation and schedule.

<!-- capture:10-en-natural-language.png:start -->
![英語で自然言語予約 / English natural-language request](screenshots/10-en-natural-language.png)
<!-- capture:10-en-natural-language.png:end -->

## 11. Locate teammates

Open People to see locations for the selected time. Show on map focuses the corresponding desk.

<!-- capture:11-en-people.png:start -->
![メンバーの位置 / Locate teammates](screenshots/11-en-people.png)
<!-- capture:11-en-people.png:end -->

## 12. Use a mobile viewport

At a 390px viewport, scroll the office map horizontally and use the assistant below it.

<!-- capture:12-en-mobile.png:start -->
![モバイル表示 / Mobile layout](screenshots/12-en-mobile.png)
<!-- capture:12-en-mobile.png:end -->

## 13. Inspect the architecture

The Cocoon AI template shows the implemented local flow separately from the undeployed cloud build target.

<!-- capture:13-architecture.png:start -->
![プロジェクト構成図 / Project architecture](screenshots/13-architecture.png)
<!-- capture:13-architecture.png:end -->
