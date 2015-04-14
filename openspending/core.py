import logging
from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.login import LoginManager
from flask.ext.babel import Babel
from flaskext.gravatar import Gravatar
from flask.ext.cache import Cache
from flask.ext.mail import Mail
from flask.ext.assets import Environment
from flaskext.uploads import UploadSet, IMAGES, configure_uploads
import formencode_jinja2
from celery import Celery
from cubes import Workspace
#from cubes.extensions import extensions
from google.refine import refine

from openspending import default_settings
from settings import OPENREFINE_SERVER
from openspending.lib.routing import NamespaceRouteRule
from openspending.lib.routing import FormatConverter, NoDotConverter
#from flask.ext.superadmin import Admin, model
import flask_admin as admin

logging.basicConfig(level=logging.DEBUG)

# specific loggers
logging.getLogger('cubes').setLevel(logging.WARNING)
logging.getLogger('markdown').setLevel(logging.WARNING)


db = SQLAlchemy()
babel = Babel()
login_manager = LoginManager()
cache = Cache()
mail = Mail()
assets = Environment()

sourcefiles = UploadSet('sourcefiles', extensions=('txt', 'rtf', 'odf', 'ods', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'xml'))


def create_app(**config):
    app = Flask(__name__)
    app.url_rule_class = NamespaceRouteRule
    app.url_map.converters['fmt'] = FormatConverter
    app.url_map.converters['nodot'] = NoDotConverter

    app.config.from_object(default_settings)
    app.config.from_envvar('OPENSPENDING_SETTINGS', silent=True)
    app.config.update(config)

    app.jinja_options['extensions'].extend([
        formencode_jinja2.formfill,
        'jinja2.ext.i18n'
    ])

    db.init_app(app)
    babel.init_app(app)
    cache.init_app(app)
    mail.init_app(app)
    assets.init_app(app)
    login_manager.init_app(app)
    configure_uploads(app, (sourcefiles,))

    # HACKY SHIT IS HACKY
    from openspending.lib.solr_util import configure as configure_solr
    configure_solr(app.config)

    # from openspending.model.provider import OpenSpendingStore
    #extensions.store.extensions['openspending'] = OpenSpendingStore
    app.cubes_workspace = Workspace()
    #db_url = app.config.get('SQLALCHEMY_DATABASE_URI')
    
    app.cubes_workspace.register_default_store('OpenSpendingStore')

    
    #do app.config in the future
    refine_server = refine.RefineServer(server=OPENREFINE_SERVER)



    try:
        test = refine_server.get_version()
    except Exception, e:
        print "Could not find OpenRefine.  Components could be broken"
        print "The error", e

    return app


def create_web_app(**config):
    app = create_app(**config)

    from openspending.views import register_views
    register_views(app, babel)

    Gravatar(app, size=200, rating='g',
             default='retro', use_ssl=True)

    from openspending.admin.routes import register_admin
    flaskadmin = admin.Admin(app, name='FIND Admin')
    #flaskadmin = Admin(app, url='/admin', name='admin2')
    register_admin(flaskadmin, db)

    return app


def create_celery(app):
    celery = Celery(app.import_name, broker=app.config['CELERY_BROKER_URL'])
    celery.conf.update(app.config)
    TaskBase = celery.Task

    class ContextTask(TaskBase):
        abstract = True
        
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return TaskBase.__call__(self, *args, **kwargs)
    
    celery.Task = ContextTask
    return celery
