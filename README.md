# StegaLens

**See what steganography actually changes.**

An interactive LSB image steganography laboratory that lets you look inside the
hiding process at the pixel and binary level.

Most steganography tools are black boxes: you upload an image, type a message,
download a new image, and hope it worked. StegaLens is the opposite. It shows
you **exactly** which bits changed, in which pixels, in which channels, and
lets you step through the embedding process one bit at a time.

**Author:** Joel Akinsanya (@reallyngb)
**Repository:** https://github.com/reallyngb/stegolens
**License:** Custom source-available (see LICENSE)

---

## Table of contents

- [Try it](#try-it)
- [What is LSB steganography?](#what-is-lsb-steganography)
- [Features](#features)
- [How it works](#how-it-works)
- [Payload format](#payload-format)
- [Project structure](#project-structure)
- [Run locally](#run-locally)
- [Run tests](#run-tests)
- [Embedding modes](#embedding-modes)
- [Limitations and honest security notes](#limitations-and-honest-security-notes)
- [Screenshots](#screenshots)
- [Author and license](#author-and-license)

---

## Try it

### Live demo

Once deployed to GitHub Pages, the app runs at:
**https://reallyngb.github.io/stegolens/**

(If that link does not work yet, run it locally — instructions below.)

### Run locally in 30 seconds

```bash
git clone https://github.com/reallyngb/stegolens.git
cd stegolens
npm install
npm run dev