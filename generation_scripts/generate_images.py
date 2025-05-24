import os
import re
import copy
import json
import sys
from pathlib import Path
from lxml import etree
from typing import List, Dict, Tuple, Optional, TextIO

SCRIPT_DIR: Path = Path(__file__).resolve().parent
SOURCE_TEMPLATES_DIR: Path = SCRIPT_DIR / "../source_templates"
WEB_TEMPLATE_DIR: Path = SCRIPT_DIR / "../website/displayables"
DOWNLOADABLE_TEMPLATE_DIR: Path = SCRIPT_DIR / "../website/downloadables"
ORDER_JSON_PATH: Path = SOURCE_TEMPLATES_DIR / "order.json"
VARIATION_LIST_PATH: Path = SCRIPT_DIR / "../website/variation_list.json"
WEB_BGND_COLOR: str = "#606060" 
WEB_BOARD_COLOR: str = "#e9ddaf" 
WEB_ENGRAVE_COLOR: str = "#28220B"
WEB_STROKE_WIDTH: str = "0.6" 

error_occurred: bool = False

def log_error(message: str, file_context: Optional[str] = None) -> None:
    global error_occurred
    error_occurred = True
    if file_context:
        print(f"::error file={file_context}::{message}")
    else:
        print(f"::error ::{message}")

def get_ordered_list_of_files() -> List[str]:
    if not SOURCE_TEMPLATES_DIR.is_dir():
        log_error(f"Source templates directory not found: {SOURCE_TEMPLATES_DIR}", file_context="generation_scripts/generate_images.py")
        return []
    actual_file_list: List[str] = [os.path.splitext(f)[0] for f in os.listdir(SOURCE_TEMPLATES_DIR)
                      if f.lower().endswith('.svg')]
    
    user_ordered_list_from_json: List[str] = []
    if ORDER_JSON_PATH.exists():
        with open(ORDER_JSON_PATH, "r") as f: 
            try:
                loaded_json: any = json.load(f)
                if isinstance(loaded_json, list):
                    user_ordered_list_from_json = [str(item) for item in loaded_json] 
                else:
                    log_error(f"{ORDER_JSON_PATH.name} does not contain a valid list. Ignoring.", file_context=ORDER_JSON_PATH.name)
            except json.JSONDecodeError:
                log_error(f"Could not decode {ORDER_JSON_PATH.name}. Proceeding with file system order only.", file_context=ORDER_JSON_PATH.name)
    else:
        print(f"::warning file={ORDER_JSON_PATH.name}::order.json not found. Using alphabetical order from file system and adding all found .svg files.")

    valid_user_ordered_list: List[str] = []
    file_base_name: str
    for file_base_name in user_ordered_list_from_json:
        if file_base_name not in actual_file_list:
            print(f"::warning file=generation_scripts/generate_images.py::File '{file_base_name}' from order.json is not in source_templates directory ({SOURCE_TEMPLATES_DIR}).")
        else:
            valid_user_ordered_list.append(file_base_name)
    
    final_ordered_list: List[str] = list(valid_user_ordered_list)
    for file_base_name in actual_file_list:
        if file_base_name not in final_ordered_list:
            print(f"::warning file=generation_scripts/generate_images.py::File '{file_base_name}.svg' from source_templates was not in order.json. Appending to end of processing list.")
            final_ordered_list.append(file_base_name)
    
    if not final_ordered_list and actual_file_list: 
        print(f"::info file=generation_scripts/generate_images.py::Defaulting to alphabetically sorted list of .svg files from {SOURCE_TEMPLATES_DIR} due to issues with order.json or empty valid list.")
        final_ordered_list = sorted(actual_file_list)
    elif not final_ordered_list and not user_ordered_list_from_json and actual_file_list:
        print(f"::info file=generation_scripts/generate_images.py::Defaulting to alphabetically sorted list of .svg files from {SOURCE_TEMPLATES_DIR}.")
        final_ordered_list = sorted(actual_file_list)

    return final_ordered_list

def create_web_version(base_file_name: str) -> None:
    file_name_svg: str = base_file_name + ".svg"
    source_path: Path = DOWNLOADABLE_TEMPLATE_DIR / file_name_svg
    
    WEB_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    dest_path: Path = WEB_TEMPLATE_DIR / file_name_svg 

    if not source_path.exists():
        log_error(f"Source file for web version not found: {source_path}", file_context="generation_scripts/generate_images.py")
        return
    
    parser: etree.XMLParser = etree.XMLParser(remove_blank_text=True)
    tree: etree._ElementTree
    try:
        tree = etree.parse(str(source_path), parser)
    except etree.XMLSyntaxError as e_xml:
        log_error(f"Failed to parse SVG for web version: {e_xml}", file_context=source_path.name)
        return
    root: etree._Element = tree.getroot()
    
    bg_rect: etree._Element = etree.Element('rect', {
        'width': '100%',
        'height': '100%',
        'fill': WEB_BGND_COLOR,
        'style': 'opacity:1',
        'id': 'background'
    })
    root.insert(0, bg_rect)
    
    elem: etree._Element
    for elem in root.xpath('//*[@style]'):
        style: Optional[str] = elem.get('style')
        if style is None: 
            continue
        
        new_style: str
        if 'fill:none' in style and 'stroke:#000000' in style:
            new_style = style.replace('fill:none', f'fill:{WEB_BOARD_COLOR}')
            new_style = re.sub(r'stroke:#000000[^;]*', 'stroke:none', new_style)
            elem.set('style', new_style)
        
        elif 'fill:none' in style and ('stroke:#FF0000' in style or 'stroke:#ff0000' in style):
            new_style = re.sub(r'stroke:#[fF]{2}0000[^;]*', f'stroke:{WEB_ENGRAVE_COLOR}', style)
            if 'stroke-width' in new_style:
                new_style = re.sub(r'stroke-width:[^;]+', f'stroke-width:{WEB_STROKE_WIDTH}', new_style)
            else:
                new_style += f';stroke-width:{WEB_STROKE_WIDTH}'
            elem.set('style', new_style)
    
    try:
        tree.write(str(dest_path), pretty_print=True, xml_declaration=True, encoding='UTF-8')
        print(f"::info file=generation_scripts/generate_images.py::Created web version: {dest_path.name}")
    except IOError as e_io:
        log_error(f"Failed to write web version SVG: {e_io}", file_context=dest_path.name)


def create_variation_files(base_file_name: str) -> int:
    NS: Dict[str, str] = {
        'svg': 'http://www.w3.org/2000/svg',
        'inkscape': 'http://www.inkscape.org/namespaces/inkscape'
    }
    
    source_file_svg: str = base_file_name + ".svg"
    source_svg_path: Path = SOURCE_TEMPLATES_DIR / source_file_svg

    if not source_svg_path.exists():
        log_error(f"Source template file not found: {source_svg_path}", file_context="generation_scripts/generate_images.py")
        return 0

    original_tree: etree._ElementTree
    try:
        original_tree = etree.parse(str(source_svg_path))
    except etree.XMLSyntaxError as e_xml_source:
        log_error(f"Failed to parse source SVG: {e_xml_source}", file_context=source_svg_path.name)
        return 0
    original_root: etree._Element = original_tree.getroot()
    
    # Remove "Created with Inkscape" comments from document level
    root = original_tree.getroot()
    doc_root = root.getroottree()
    
    # Iterate through document children (root siblings) to find and remove comments
    for element in list(doc_root.getroot().itersiblings(preceding=True)):
        if isinstance(element, etree._Comment) and 'Created with Inkscape' in element.text:
            parent = element.getparent()
            if parent is not None:
                parent.remove(element)
    
    # Also check any comments after the root element
    for element in list(doc_root.getroot().itersiblings()):
        if isinstance(element, etree._Comment) and 'Created with Inkscape' in element.text:
            parent = element.getparent()
            if parent is not None:
                parent.remove(element)

    new_comment_text: str = f'''
WARNING: AUTO-GENERATED FILE - START
=============================================================================
Generated from source_templates/{source_file_svg} by generation_scripts/generate_images.py
DO NOT EDIT THIS FILE DIRECTLY
IT WILL BE OVERWRITTEN ON NEXT GENERATION
=============================================================================
WARNING: AUTO-GENERATED FILE - END
'''
    new_comment: etree._Comment = etree.Comment(new_comment_text)
    original_root.addprevious(new_comment)
    
    engraving_layers_original: List[etree._Element] = original_root.xpath(
        "//svg:g[starts-with(@inkscape:label, 'Engrave')]",
        namespaces=NS
    )
    
    DOWNLOADABLE_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

    variation_count: int = 0
    successful_variations: int = 0

    base_tree_copy: etree._ElementTree = copy.deepcopy(original_tree)
    base_root_copy: etree._Element = base_tree_copy.getroot()
    
    layer_element: etree._Element
    for layer_element in base_root_copy.xpath("//svg:g[starts-with(@inkscape:label, 'Engrave')]", namespaces=NS):
        parent = layer_element.getparent()
        if parent is not None:
            parent.remove(layer_element)
    
    variation_count += 1
    base_variation_name: str = f"{base_file_name}_var{variation_count}"
    no_engraving_output_filename_svg: str = f"{base_variation_name}.svg"
    no_engraving_output_path: Path = DOWNLOADABLE_TEMPLATE_DIR / no_engraving_output_filename_svg
    try:
        base_tree_copy.write(str(no_engraving_output_path), pretty_print=True, xml_declaration=True, encoding='UTF-8')
        print(f"::info file=generation_scripts/generate_images.py::Created downloadable: {no_engraving_output_filename_svg}")
        create_web_version(base_variation_name)
        successful_variations += 1
    except IOError as e_io_base:
        log_error(f"Failed to write downloadable SVG: {e_io_base}", file_context=no_engraving_output_filename_svg)

    original_layer_element: etree._Element
    for original_layer_element in engraving_layers_original:
        variation_count += 1
        layer_tree_copy: etree._ElementTree = copy.deepcopy(original_tree)
        layer_root_copy: etree._Element = layer_tree_copy.getroot()
        
        layer_id_to_keep: Optional[str] = original_layer_element.get('id')
        if not layer_id_to_keep:
            print(f"::warning file={source_file_svg}::Engraving layer found without an ID. Skipping this layer variation.")
            continue
            
        other_layer: etree._Element
        for other_layer in layer_root_copy.xpath("//svg:g[starts-with(@inkscape:label, 'Engrave')]", namespaces=NS):
            if other_layer.get('id') != layer_id_to_keep:
                parent = other_layer.getparent()
                if parent is not None:
                    parent.remove(other_layer)
        
        layer_variation_base_name: str = f"{base_file_name}_var{variation_count}"
        layer_variation_filename_svg: str = f"{layer_variation_base_name}.svg"
        layer_variation_output_path: Path = DOWNLOADABLE_TEMPLATE_DIR / layer_variation_filename_svg
        try:
            layer_tree_copy.write(str(layer_variation_output_path), pretty_print=True, xml_declaration=True, encoding='UTF-8')
            print(f"::info file=generation_scripts/generate_images.py::Created downloadable: {layer_variation_filename_svg}")
            create_web_version(layer_variation_base_name)
            successful_variations += 1
        except IOError as e_io_layer:
            log_error(f"Failed to write downloadable SVG: {e_io_layer}", file_context=layer_variation_filename_svg)
            
    return successful_variations


def main() -> None:
    WEB_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOADABLE_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

    files_to_process: List[str] = get_ordered_list_of_files()
    if not files_to_process:
        if not error_occurred: 
             log_error("No files found to process. This could be due to missing source files, an empty or misconfigured order.json, or the source directory not found.", file_context="generation_scripts/generate_images.py")
        return

    variation_summary_list: List[Tuple[str, int]] = []
    total_variations_generated: int = 0
    
    file_name_base: str
    for file_name_base in files_to_process:
        print(f"::group::Processing file: {file_name_base}.svg")
        try:
            num_vars: int = create_variation_files(file_name_base)
            
            if num_vars > 0:
                variation_summary_list.append((file_name_base, num_vars))
                total_variations_generated += num_vars
                print(f"::info file=generation_scripts/generate_images.py::{num_vars} variations successfully generated for {file_name_base}.svg.")
            else:
                print(f"::warning file=generation_scripts/generate_images.py::No variations successfully generated for {file_name_base}.svg. This might be expected if the file has no engrave layers or if write errors occurred (see previous logs).")
            print("::endgroup::")
            
        except Exception as e:
            log_error(f"CRITICAL: An unexpected error occurred while processing {file_name_base}.svg: {e}. Halting further file processing.", file_context=f"{file_name_base}.svg")
            print("::endgroup::")
            break  

    if total_variations_generated == 0 and files_to_process:
        log_error(f"No variations were successfully generated for any of the {len(files_to_process)} input file(s). Check warnings and errors above.", file_context="generation_scripts/generate_images.py")

    if variation_summary_list: 
        try:
            with open(VARIATION_LIST_PATH, "w") as f_json: 
                json.dump(variation_summary_list, f_json, indent=2)
            print(f"::info file=generation_scripts/generate_images.py::Variation list written to {VARIATION_LIST_PATH.name}")
        except IOError as e_io_main:
            log_error(f"Failed to write variation list JSON: {e_io_main}", file_context=VARIATION_LIST_PATH.name)
    elif files_to_process and not error_occurred: 
        print(f"::warning file=generation_scripts/generate_images.py::No successful variations to write to {VARIATION_LIST_PATH.name}.")
    
    if not error_occurred:
        print(f"::notice file=generation_scripts/generate_images.py,title=Processing Complete::--- Finished processing. Total successful variations generated: {total_variations_generated} ---")
    else:
        print(f"::warning file=generation_scripts/generate_images.py,title=Processing Finished with Errors::--- Finished processing with errors. Total successful variations generated: {total_variations_generated} ---")

if __name__ == "__main__":
    main()
    if error_occurred:
        print("Exiting with status 1 (errors occurred).", file=sys.stderr)
        sys.exit(1)
    else:
        print("Exiting with status 0 (success).")
        sys.exit(0)
