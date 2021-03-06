# -*- coding: utf-8 -*-
"""
    flaskbb.utils.decorators
    ~~~~~~~~~~~~~~~~~~~~~~~~

    A place for our decorators.

    :copyright: (c) 2014 by the FlaskBB Team.
    :license: BSD, see LICENSE for more details.
"""
from functools import wraps

from flask import abort
from flask_login import current_user

from openspending.auth.forum import check_perm, is_moderator, is_admin

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.is_anonymous() or getattr(current_user,"is_lockdownuser",False):
            abort(403)
        if not is_admin(current_user):
            abort(403)
        return f(*args, **kwargs)
    return decorated


def moderator_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.is_anonymous() or getattr(current_user,"is_lockdownuser",False):
            abort(403)

        if not is_moderator(current_user):
            abort(403)

        return f(*args, **kwargs)
    return decorated


def can_access_forum(func):
    """
    If you are logged in you can view the forum

    """
    def decorated(*args, **kwargs):
        if current_user.is_anonymous() or getattr(current_user,"is_lockdownuser",False):
            abort(403)

        return func(*args, **kwargs)

        # forum_id = kwargs['forum_id'] if 'forum_id' in kwargs else args[1]
        # from openspending.forum.forum.models import Forum


        # user_forums = Forum.query.all()

        # if len(user_forums) < 1:
        #     abort(403)

        # return func(*args, **kwargs)
    return decorated


def can_access_topic(func):
    def decorated(*args, **kwargs):
        if current_user.is_anonymous() or getattr(current_user,"is_lockdownuser",False):
            abort(403)

        return func(*args, **kwargs)


        # topic_id = kwargs['topic_id'] if 'topic_id' in kwargs else args[1]
        # from openspending.forum.forum.models import Forum, Topic

        # topic = Topic.query.filter_by(id=topic_id).first()

        # user_forums = Forum.query.all()

        # if len(user_forums) < 1:
        #     abort(403)

        # return func(*args, **kwargs)
    return decorated
