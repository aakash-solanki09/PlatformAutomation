import logging
from browser_use.dom.serializer.serializer import DOMTreeSerializer
from browser_use.dom.views import NodeType, SimplifiedNode

logger = logging.getLogger(__name__)

def apply_patches():
    """Applies the LinkedIn radio button fix via monkey-patching."""
    
    # Store original methods
    original_create = DOMTreeSerializer._create_simplified_tree
    original_optimize = DOMTreeSerializer._optimize_tree
    original_assign = DOMTreeSerializer._assign_interactive_indices_and_mark_new_nodes

    def patched_create_simplified_tree(self, node, depth=0):
        # 1. Handle Document/Fragment nodes
        if node.node_type == NodeType.DOCUMENT_NODE:
            for child in node.children_and_shadow_roots:
                simplified_child = self._create_simplified_tree(child, depth + 1)
                if simplified_child:
                    return simplified_child
            return None

        if node.node_type == NodeType.DOCUMENT_FRAGMENT_NODE:
            simplified = SimplifiedNode(original_node=node, children=[])
            for child in node.children_and_shadow_roots:
                simplified_child = self._create_simplified_tree(child, depth + 1)
                if simplified_child:
                    simplified.children.append(simplified_child)
            return simplified if simplified.children else SimplifiedNode(original_node=node, children=[])

        # 2. Handle Element nodes
        elif node.node_type == NodeType.ELEMENT_NODE:
            # Skip non-content elements and SVG children
            DISABLED_ELEMENTS = {'style', 'script', 'head', 'meta', 'link', 'title'}
            SVG_ELEMENTS = {'path', 'rect', 'g', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'use', 'defs', 'clipPath', 'mask', 'pattern', 'image', 'text', 'tspan'}
            
            if node.node_name.lower() in DISABLED_ELEMENTS: return None
            if node.node_name.lower() in SVG_ELEMENTS: return None

            # Handle exclusion attributes
            attributes = node.attributes or {}
            if attributes.get('data-browser-use-exclude') == 'true': return None
            if self.session_id:
                if attributes.get(f'data-browser-use-exclude-{self.session_id}') == 'true': return None

            # Handle iframes
            if node.node_name in ['IFRAME', 'FRAME']:
                if node.content_document:
                    simplified = SimplifiedNode(original_node=node, children=[])
                    for child in node.content_document.children_nodes or []:
                        simplified_child = self._create_simplified_tree(child, depth + 1)
                        if simplified_child: simplified.children.append(simplified_child)
                    return simplified

            is_visible = node.is_visible
            is_scrollable = node.is_actually_scrollable
            has_shadow_content = bool(node.children_and_shadow_roots)
            is_shadow_host = any(child.node_type == NodeType.DOCUMENT_FRAGMENT_NODE for child in node.children_and_shadow_roots)

            # --- DEEP FIX: Force visibility for radio/checkbox/file inputs ---
            is_input_exception = (
                node.tag_name and node.tag_name.lower() == 'input' 
                and attributes.get('type') in ['file', 'radio', 'checkbox']
            )
            if not is_visible and is_input_exception:
                is_visible = True
            # -----------------------------------------------------------------

            if is_visible or is_scrollable or has_shadow_content or is_shadow_host:
                simplified = SimplifiedNode(original_node=node, children=[], is_shadow_host=is_shadow_host)
                for child in node.children_and_shadow_roots:
                    simplified_child = self._create_simplified_tree(child, depth + 1)
                    if simplified_child: simplified.children.append(simplified_child)
                
                self._add_compound_components(simplified, node)
                if is_shadow_host and simplified.children: return simplified
                if is_visible or is_scrollable or simplified.children: return simplified

        # 3. Handle Text nodes
        elif node.node_type == NodeType.TEXT_NODE:
            is_visible = node.snapshot_node and node.is_visible
            if is_visible and node.node_value and node.node_value.strip() and len(node.node_value.strip()) > 1:
                return SimplifiedNode(original_node=node, children=[])

        return None

    def patched_optimize_tree(self, node):
        if not node: return None
        optimized_children = []
        for child in node.children:
            optimized_child = self._optimize_tree(child)
            if optimized_child: optimized_children.append(optimized_child)
        node.children = optimized_children

        is_visible = node.original_node.snapshot_node and node.original_node.is_visible
        
        # --- DEEP FIX: Keep radio/checkbox/file inputs during optimization ---
        is_input_exception = (
            node.original_node.tag_name
            and node.original_node.tag_name.lower() == 'input'
            and node.original_node.attributes.get('type') in ['file', 'radio', 'checkbox']
        )
        # ---------------------------------------------------------------------

        if (is_visible or node.original_node.is_actually_scrollable or 
            node.original_node.node_type == NodeType.TEXT_NODE or 
            node.children or is_input_exception):
            return node
        return None

    def patched_assign_indices(self, node):
        if not node: return
        if not node.excluded_by_parent and not node.ignored_by_paint_order:
            is_interactive_assign = self._is_interactive_cached(node.original_node)
            is_visible = node.original_node.snapshot_node and node.original_node.is_visible
            is_scrollable = node.original_node.is_actually_scrollable
            
            # --- DEEP FIX: Exception for hidden radio/checkbox/file inputs ---
            is_input_exception = (
                node.original_node.tag_name
                and node.original_node.tag_name.lower() == 'input'
                and node.original_node.attributes.get('type') in ['file', 'radio', 'checkbox']
            )
            # -----------------------------------------------------------------

            is_shadow_dom_element = (
                is_interactive_assign
                and not node.original_node.snapshot_node
                and node.original_node.tag_name
                and node.original_node.tag_name.lower() in ['input', 'button', 'select', 'textarea', 'a']
                and self._is_inside_shadow_dom(node)
            )

            should_make_interactive = False
            if is_scrollable:
                attrs = node.original_node.attributes or {}
                role = attrs.get('role', '').lower()
                tag_name = (node.original_node.tag_name or '').lower()
                class_attr = attrs.get('class', '').lower()
                is_dropdown = (role in ('listbox', 'menu', 'combobox') or tag_name == 'select' or 'dropdown' in class_attr)
                if is_dropdown: should_make_interactive = True
                elif not self._has_interactive_descendants(node): should_make_interactive = True
            elif is_interactive_assign and (is_visible or is_input_exception or is_shadow_dom_element):
                should_make_interactive = True

            if should_make_interactive:
                node.is_interactive = True
                self._selector_map[node.original_node.backend_node_id] = node.original_node
                self._interactive_counter += 1
                if node.is_compound_component: node.is_new = True
                elif self._previous_cached_selector_map:
                    previous_ids = {n.backend_node_id for n in self._previous_cached_selector_map.values()}
                    if node.original_node.backend_node_id not in previous_ids: node.is_new = True

        for child in node.children:
            self._assign_interactive_indices_and_mark_new_nodes(child)

    # Apply patches
    DOMTreeSerializer._create_simplified_tree = patched_create_simplified_tree
    DOMTreeSerializer._optimize_tree = patched_optimize_tree
    DOMTreeSerializer._assign_interactive_indices_and_mark_new_nodes = patched_assign_indices
    
    logger.info("✅ Patched browser-use DOMTreeSerializer for LinkedIn radio button support.")
    print("✅ Patched browser-use DOMTreeSerializer for LinkedIn radio button support.")
