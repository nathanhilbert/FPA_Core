import os

from openspending import auth as can
from openspending.ui.lib import helpers as h

from jinja2 import FileSystemLoader
from jinja2.environment import Environment
import formencode_jinja2


# Set the directory where this file is as the template root directory
template_rootdir = os.path.abspath(os.path.dirname(__file__))


def section_active(section):
    sections = ["blog", "dataset", "search", "resources", "help", "about"]
    tmp = dict([(s, section == s)for s in sections])
    tmp["dataset"] = bool(c.dataset)

    return dict([(k, {
                True: "active",
                False: ""
                }[v]) for k, v in tmp.iteritems()])


def render(path, **kwargs):
    """Render a template with jinja2

    Args:
      path (str): the path to the template; should be of the form
      "dir/filename.html"

    """

    env = Environment(loader=FileSystemLoader(template_rootdir),
                      extensions=[formencode_jinja2.formfill,
                                  'jinja2.ext.i18n'])
    env.install_gettext_translations(i18n)

    template = env.get_template(path)

    static_cache_version = config.get("openspending.static_cache_version", "")
    if static_cache_version != "":
        static_cache_version = "?" + static_cache_version

    params = {
        "script_root": h.script_root(),
        "script_boot": h.script_tag('prod/boot'),
        "bootstrap_css": h.static('style/bootstrap.css'),
        "style_css": h.static('style/style.css'),
        "number_symbols_group": c.locale.number_symbols.get('group'),
        "number_symbols_decimal": c.locale.number_symbols.get('decimal'),
        "site_title": app_globals.site_title,
        "static": config.get("openspending.static_path", "/static/"),
        "static_cache_version": static_cache_version,
        "messages": list(h._flash.pop_messages()),
        "languages": languages(c.detected_l10n_languages, c.language),
        "section_active": section_active(c.content_section),
        "account": c.account is not None,
        "h": h,
        "c": c,
        "g": app_globals,
        "can": can,
        "show_rss": hasattr(c, 'show_rss') and c.show_rss or None,
    }
    params.update(kwargs)
    if 'form_fill' in params:
        if params['form_fill'] is not None and len(params['form_fill']) > 0:
            params['form_fill'] = dict(params['form_fill'])
        else:
            params['form_fill'] = {}

    return template.render(params)
