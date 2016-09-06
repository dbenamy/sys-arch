# Usage

Create an index.html like:

```html
<!DOCTYPE html>
<html>
<link rel="stylesheet" type="text/css" href="arch-draw.css">
<script src="viz.js"></script>
<script src="js-yaml.min.js"></script>
<script src="arch-draw.js"></script>
<script type="text/javascript">
var SYSTEM_YAML = `

# top level entries are groups
web:
# entries within groups are services
- name: haproxy
  connectsTo:
  - app
- name: app
  connectsTo:
  - postgres
  - redis

# for single-service groups it might make sense to name the group after the service
postgres:
- name: postgres

bg work:
- name: redis
- name: bg worker
  connectsTo:
  - redis
- name: bg scheduler
  connectsTo:
  - redis

`;
window.onload = function() {
    archDraw.init(jsyaml.load(SYSTEM_YAML));
};

</script>
</html>

```

# TODO

- Optional labels on arrows explaining reason for connection. Make connectsTo entries be able to be 2 items lists of [dst, desc].
- Highlight arrows on hover.
- Add optional label field which is shown instead of name if given. i want to keep name to make connections easier.
- Add optional shape. I want this for dbs.
- Look into adding shape/indicator that something has many boxen.
- Add a maintainer prop.
- Maybe a 3rd level of nesting for libraries libraries (could use record based graphviz nodes)