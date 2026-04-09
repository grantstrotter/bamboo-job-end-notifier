# Bamboo Job End Notifier (Chrome Extension)

A Chrome extension that triggers an OS notification and plays an audible alert when a Bamboo CI/CD build or deploy completes.

## Installation

Install through the [Chrome Web Store](https://chromewebstore.google.com/detail/bamboo-job-end-notifier/mkihbhlcknfbacpemllbhjelmeclijkj).

This extension currently supports Chromium-based browsers (Chrome, Brave, Edge). Firefox and Safari are not supported.

## Setup
Notifications must be enabled for your browser at the OS level.

### MacOS
System Settings → Google Chrome (or other browser if preferred)
- Switch the toggle on
- Set Alert Style to "Persistent" (in case you've stepped away at the moment of the notification)

## Usage

Navigate to any Bamboo build or deploy result page. While the job is in progress, a small Alert toggle will appear in the top-left corner of the status ribbon.

The alert is off by default. Check the box to enable it before the job completes. When the job finishes, the alert will play.

The setting is persisted across page loads.

## How it works

The extension watches for three events while a job is in progress:

- The `InProgress` class is removed from the status ribbon element
- The status ribbon element is removed from the DOM entirely
- The page is unloaded (this handles cases in which the page automatically navigates to a new location)
