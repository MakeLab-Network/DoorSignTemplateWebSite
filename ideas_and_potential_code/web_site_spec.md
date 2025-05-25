The root directory for the website is website.
The website is static, so any logic past the one in generation_scripts/generate_images.py need to be done in the browser.

The file config.json contains the background color for the website.
It also contain the various templates that can be downloaded and the
number of variations for each.

The different templates should appear in a grid, no padding, no text.
the template shown should be taken from the directory displayable.
the different variations should be transitions with a left-to-right sweep. the files name are the base name + _var<num>.svg (0-based.)
once the user clicked on one of the option, he will be directed to another page, where he can choose the variation from.
in that page the variations will be shown in a grid with larger cell, each variation by itself, no animation.
each cell will have a "Download" button below the variation.
when the user clicks the download of the variation he selected,
the variation will be read from the downloadable directory, striped of the warning and be given the user to save as "DoorSign.svg."

In the idea_and_potential_code there are draft implementation files,
although the spec has changed since. specifically there are remove_svg_warning_in_browser.md and remove_svg_warning.js for the removal of the warning.
styles.css, script.js, index.html are a draft for the display of the first page. it might freeze the animation when hovered on a cell, but i do not want that behaviour, since the user will select the variation in the next page.
