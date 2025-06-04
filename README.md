# Door Sign ~~Template~~ Shape Website

## General
A website for downloading various shapes for a door sign, a walk-in activity in the MakeLab, and the content of the sign is to be added by the participant using Inkscape.

## Web Site Generation

This project uses GitHub Actions and Python scripts to automatically generate the website.
Due to a limitation of LightBurn that does not recognized hidden layers are such, the generation script generate various variations of each svg file: One for the basic shape, and one for each engraving possibility (includes the basic shape.)

## Guide to Adding Shapes / Engravings in Inkscape

### Important
- Currently all files are public domain. Do NOT add shapes which are not open sourced.
- If a shape you added has a different license, change `source_templates/LICENSE` and specify what files are in what license. If required by the license, add `source_templates/NOTICE` file.
- Copyrighted royaltee free purchased shapes are NOT appropriate, since the user can edit them, and the user is not the licensee.

### Instructions
- For a new shapes, Use `starting_point.svg` as your foundation when creating new shapes. put the basic shape in the "Cut" layer: black stroke, stroke width 0.4mm, no fill. Leave about 1cm margin from each of the 4 sides.
- Each possible engraving must be in its own separate layer: red stroke, stroke width 0.4mm, no fill. If there is a possibility for two engravings together, they are also need to be together in their own layer, even if each one is already in its another layer.
- All engraving layer names must start with "Engrave" (e.g., "Engrave", "Engrave 2")
- All layers need to be visible; all layers except "Contents" should be locked before saving.
- If you have layers that you do not want to be in the generated files, have their name start with "-", those layers may be hidden. Such layers may contain base shapes that would be used for new engraving layers. See 'stars.svg as an example.
- Save it under the `source_templates` directory.
- Add it, without the `.svg` to `source_templates/order.json` which specify the order which the various shapes are displayed in the website.
