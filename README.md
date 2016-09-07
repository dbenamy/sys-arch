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
  # connections always refer to services, even if there's a group with the same name
  - postgres
  - redis

postgres:
- name: postgres
  # you can add an optional description
  description: leader + hot standby
  # and an optional url for more info
  url: https://my.wiki.com/postgres

bg work:
- name: redis
- name: worker
  connectsTo:
  # a connection can be a 2 item list where the 2nd item is the reason for the connection
  - [redis, pops work from a queue]
- name: scheduler
  connectsTo:
  - [redis, enqueues periodic work]

`;
window.onload = function() {
    archDraw.init(jsyaml.load(SYSTEM_YAML));
};

</script>
</html>

```

# TODO

- Legend.
- Add optional shape. I want this for dbs.
- Look into adding shape/indicator that something has many boxen.
- Add a maintainer prop.
- Maybe a 3rd level of nesting for libraries libraries (could use record based graphviz nodes)
