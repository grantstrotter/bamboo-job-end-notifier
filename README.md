# Bamboo Job End Notifier (Chrome Extension)

A Chrome extension that plays an audible chime when a Bamboo CI/CD build or deploy completes.

## Installation

A link to the Chrome Web Store will probably be added soon.

## Usage

Navigate to any Bamboo build or deploy result page. While the job is **in progress**, a small **Chime** toggle will appear in the top-left corner of the status ribbon.

The chime is **off by default**. Check the box to enable it before the job completes. When the job finishes — or if you navigate away while it's still running — the chime will play.

The setting is not persisted across page loads, so you'll need to check the box each time.

## How it works

The extension watches for three events while a job is in progress:

- The `InProgress` class is removed from the status ribbon element
- The status ribbon element is removed from the DOM entirely
- The page is unloaded (e.g. you navigate away)
