# -*- coding: utf-8 -*-
"""
    flaskbb.forum.views
    ~~~~~~~~~~~~~~~~~~~~

    This module handles the forum logic like creating and viewing
    topics and posts.

    :copyright: (c) 2014 by the FlaskBB Team.
    :license: BSD, see LICENSE for more details.
"""
import datetime

from flask import (Blueprint, redirect, url_for, current_app,
                   request, flash, jsonify, render_template)
from flask_login import login_required, current_user
from flask_babelex import gettext as _

from openspending.core import db
from openspending.forum.utils.settings import flaskbb_config
from openspending.forum.utils.helpers import (get_online_users, time_diff, format_quote,
                                   do_topic_action)
from openspending.auth.forum import (can_post_reply, can_post_topic,
                                       can_delete_topic, can_delete_post,
                                       can_edit_post, can_moderate)
from openspending.forum.forum.models import (Category, Forum, Topic, Post, ForumsRead,
                                  TopicsRead)
from openspending.forum.forum.forms import (QuickreplyForm, ReplyForm, NewTopicForm,
                                 ReportForm, UserSearchForm, SearchPageForm)
from openspending.model.account import Account as User

forum = Blueprint("forum", __name__)


@forum.route("/")
def index():
    categories = Category.get_all(user=current_user)

    # Fetch a few stats about the forum
    user_count = User.query.count()
    topic_count = Topic.query.count()
    post_count = Post.query.count()
    newest_user = User.query.order_by(User.id.desc()).first()


    # online_users = len(get_online_users())
    # online_guests = len(get_online_users(guest=True))

    return render_template("forum/forum/index.html",
                           categories=categories,
                           user_count=user_count,
                           topic_count=topic_count,
                           post_count=post_count,
                           newest_user=newest_user)
                           # online_users=online_users,
                           # online_guests=online_guests)


@forum.route("/category/<int:category_id>")
@forum.route("/category/<int:category_id>-<slug>")
def view_category(category_id, slug=None):
    category, forums = Category.\
        get_forums(category_id=category_id, user=current_user)

    return render_template("forum/forum/category.html", forums=forums,
                           category=category)


@forum.route("/forum/<int:forum_id>")
@forum.route("/forum/<int:forum_id>-<slug>")
def view_forum(forum_id, slug=None):
    page = request.args.get('page', 1, type=int)

    forum_instance, forumsread = Forum.get_forum(forum_id=forum_id,
                                                 user=current_user)

    if forum_instance.external:
        return redirect(forum_instance.external)

    topics = Forum.get_topics(
        forum_id=forum_instance.id, user=current_user, page=page,
        per_page=flaskbb_config["TOPICS_PER_PAGE"]
    )

    return render_template(
        "forum/forum/forum.html", forum=forum_instance,
        topics=topics, forumsread=forumsread,
    )


@forum.route("/topic/<int:topic_id>", methods=["POST", "GET"])
@forum.route("/topic/<int:topic_id>-<slug>", methods=["POST", "GET"])
def view_topic(topic_id, slug=None):
    page = request.args.get('page', 1, type=int)

    # Fetch some information about the topic
    topic = Topic.get_topic(topic_id=topic_id, user=current_user)

    # Count the topic views
    topic.views += 1
    topic.save()

    # fetch the posts in the topic
    posts = Post.query.\
        join(User, Post.user_id == User.id).\
        filter(Post.topic_id == topic.id).\
        add_entity(User).\
        order_by(Post.id.asc()).\
        paginate(page, flaskbb_config['POSTS_PER_PAGE'], False)

    # Update the topicsread status if the user hasn't read it
    forumsread = None
    if current_user.is_authenticated():
        forumsread = ForumsRead.query.\
            filter_by(user_id=current_user.id,
                      forum_id=topic.forum.id).first()

    topic.update_read(current_user, topic.forum, forumsread)

    form = None
    if can_post_reply(user=current_user, topic=topic):
        form = QuickreplyForm()
        if form.validate_on_submit():
            post = form.save(current_user, topic)
            return view_post(post.id)

    return render_template("forum/forum/topic.html", topic=topic, posts=posts,
                           last_seen=time_diff(), form=form)


@forum.route("/post/<int:post_id>")
def view_post(post_id):
    post = Post.query.filter_by(id=post_id).first_or_404()
    count = post.topic.post_count
    page = count / flaskbb_config["POSTS_PER_PAGE"]

    if count > flaskbb_config["POSTS_PER_PAGE"]:
        page += 1
    else:
        page = 1

    return redirect(post.topic.url + "?page=%d#pid%s" % (page, post.id))


@forum.route("/<int:forum_id>/topic/new", methods=["POST", "GET"])
@forum.route("/<int:forum_id>-<slug>/topic/new", methods=["POST", "GET"])
@login_required
def new_topic(forum_id, slug=None):
    forum_instance = Forum.query.filter_by(id=forum_id).first_or_404()

    if not can_post_topic(user=current_user, forum=forum_instance):
        flash(_("You do not have the permissions to create a new topic."),
              "danger")
        return redirect(forum.url)

    form = NewTopicForm()
    if request.method == "POST":
        if "preview" in request.form and form.validate():
            return render_template(
                "forum/forum/new_topic.html", forum=forum_instance,
                form=form, preview=form.content.data
            )
        if "submit" in request.form and form.validate():
            topic = form.save(current_user, forum_instance)
            # redirect to the new topic
            return redirect(url_for('forum.view_topic', topic_id=topic.id))

    return render_template(
        "forum/forum/new_topic.html", forum=forum_instance, form=form
    )


@forum.route("/topic/<int:topic_id>/delete", methods=["POST"])
@forum.route("/topic/<int:topic_id>-<slug>/delete", methods=["POST"])
@login_required
def delete_topic(topic_id=None, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    if not can_delete_topic(user=current_user, topic=topic):
        flash(_("You do not have the permissions to delete this topic."),
              "danger")
        return redirect(topic.forum.url)

    involved_users = User.query.filter(Post.topic_id == topic.id,
                                       User.id == Post.user_id).all()
    topic.delete(users=involved_users)
    return redirect(url_for("forum.view_forum", forum_id=topic.forum_id))


@forum.route("/topic/<int:topic_id>/lock", methods=["POST"])
@forum.route("/topic/<int:topic_id>-<slug>/lock", methods=["POST"])
@login_required
def lock_topic(topic_id=None, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    if not can_moderate(user=current_user, forum=topic.forum):
        flash(_("You do not have the permissions to lock this topic."),
              "danger")
        return redirect(topic.url)

    topic.locked = True
    topic.save()
    return redirect(topic.url)


@forum.route("/topic/<int:topic_id>/unlock", methods=["POST"])
@forum.route("/topic/<int:topic_id>-<slug>/unlock", methods=["POST"])
@login_required
def unlock_topic(topic_id=None, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    if not can_moderate(user=current_user, forum=topic.forum):
        flash(_("You do not have the permissions to unlock this topic."),
              "danger")
        return redirect(topic.url)

    topic.locked = False
    topic.save()
    return redirect(topic.url)


@forum.route("/topic/<int:topic_id>/highlight", methods=["POST"])
@forum.route("/topic/<int:topic_id>-<slug>/highlight", methods=["POST"])
@login_required
def highlight_topic(topic_id=None, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    if not can_moderate(user=current_user, forum=topic.forum):
        flash(_("You do not have the permissions to highlight this topic."),
              "danger")
        return redirect(topic.url)

    topic.important = True
    topic.save()
    return redirect(topic.url)


@forum.route("/topic/<int:topic_id>/trivialize", methods=["POST"])
@forum.route("/topic/<int:topic_id>-<slug>/trivialize", methods=["POST"])
@login_required
def trivialize_topic(topic_id=None, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    # Unlock is basically the same as lock
    if not can_moderate(user=current_user, forum=topic.forum):
        flash(_("You do not have the permissions to trivialize this topic."),
              "danger")
        return redirect(topic.url)

    topic.important = False
    topic.save()
    return redirect(topic.url)


@forum.route("/forum/<int:forum_id>/edit", methods=["POST", "GET"])
@forum.route("/forum/<int:forum_id>-<slug>/edit", methods=["POST", "GET"])
@login_required
def manage_forum(forum_id, slug=None):
    page = request.args.get('page', 1, type=int)

    forum_instance, forumsread = Forum.get_forum(forum_id=forum_id,
                                                 user=current_user)

    # remove the current forum from the select field (move).
    available_forums = Forum.query.order_by(Forum.position).all()
    available_forums.remove(forum_instance)

    if not can_moderate(current_user, forum=forum_instance):
        flash(_("You do not have the permissions to moderate this forum."),
              "danger")
        return redirect(forum_instance.url)

    if forum_instance.external:
        return redirect(forum_instance.external)

    topics = Forum.get_topics(
        forum_id=forum_instance.id, user=current_user, page=page,
        per_page=flaskbb_config["TOPICS_PER_PAGE"]
    )

    mod_forum_url = url_for("forum.manage_forum", forum_id=forum_instance.id,
                            slug=forum_instance.slug)

    # the code is kind of the same here but it somehow still looks cleaner than
    # doin some magic
    if request.method == "POST":
        ids = request.form.getlist("rowid")
        tmp_topics = Topic.query.filter(Topic.id.in_(ids)).all()

        # locking/unlocking
        if "lock" in request.form:
            changed = do_topic_action(topics=tmp_topics, user=current_user,
                                      action="locked", reverse=False)

            flash(_("%(count)s Topics locked.", count=changed), "success")
            return redirect(mod_forum_url)

        elif "unlock" in request.form:
            changed = do_topic_action(topics=tmp_topics, user=current_user,
                                      action="locked", reverse=True)
            flash(_("%(count)s Topics unlocked.", count=changed), "success")
            return redirect(mod_forum_url)

        # highlighting/trivializing
        elif "highlight" in request.form:
            changed = do_topic_action(topics=tmp_topics, user=current_user,
                                      action="important", reverse=False)
            flash(_("%(count)s Topics highlighted.", count=changed), "success")
            return redirect(mod_forum_url)

        elif "trivialize" in request.form:
            changed = do_topic_action(topics=tmp_topics, user=current_user,
                                      action="important", reverse=True)
            flash(_("%(count)s Topics trivialized.", count=changed), "success")
            return redirect(mod_forum_url)

        # deleting
        elif "delete" in request.form:
            changed = do_topic_action(topics=tmp_topics, user=current_user,
                                      action="delete", reverse=False)
            flash(_("%(count)s Topics deleted.", count=changed), "success")
            return redirect(mod_forum_url)

        # moving
        elif "move" in request.form:
            new_forum_id = request.form.get("forum")

            if not new_forum_id:
                flash(_("Please choose a new forum for the topics."), "info")
                return redirect(mod_forum_url)

            new_forum = Forum.query.filter_by(id=new_forum_id).first_or_404()
            # check the permission in the current forum and in the new forum
            if not can_moderate(current_user, forum_instance) or \
                    not can_moderate(current_user, new_forum):
                flash(_("You do not have the permissions to move this topic."),
                      "danger")
                return redirect(mod_forum_url)

            new_forum.move_topics_to(tmp_topics)
            return redirect(mod_forum_url)

    return render_template(
        "forum/forum/edit_forum.html", forum=forum_instance, topics=topics,
        available_forums=available_forums, forumsread=forumsread,
    )


@forum.route("/topic/<int:topic_id>/post/new", methods=["POST", "GET"])
@forum.route("/topic/<int:topic_id>-<slug>/post/new", methods=["POST", "GET"])
@login_required
def new_post(topic_id, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()

    if not can_post_reply(user=current_user, topic=topic):
        flash(_("You do not have the permissions to post in this topic."),
              "danger")
        return redirect(topic.forum.url)

    form = ReplyForm()
    if form.validate_on_submit():
        if "preview" in request.form:
            return render_template(
                "forum/new_post.html", topic=topic,
                form=form, preview=form.content.data
            )
        else:
            post = form.save(current_user, topic)
            return view_post(post.id)

    return render_template("forum/forum/new_post.html", topic=topic, form=form)


@forum.route(
    "/topic/<int:topic_id>/post/<int:post_id>/reply", methods=["POST", "GET"]
)
@login_required
def reply_post(topic_id, post_id):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()
    post = Post.query.filter_by(id=post_id).first_or_404()

    if not can_post_reply(user=current_user, topic=topic):
        flash(_("You do not have the permissions to post in this topic."),
              "danger")
        return redirect(topic.forum.url)

    form = ReplyForm()
    if form.validate_on_submit():
        if "preview" in request.form:
            return render_template(
                "forum/new_post.html", topic=topic,
                form=form, preview=form.content.data
            )
        else:
            form.save(current_user, topic)
            return redirect(post.topic.url)
    else:
        form.content.data = format_quote(post.username, post.content)

    return render_template("forum/forum/new_post.html", topic=post.topic, form=form)


@forum.route("/post/<int:post_id>/edit", methods=["POST", "GET"])
@login_required
def edit_post(post_id):
    post = Post.query.filter_by(id=post_id).first_or_404()

    if not can_edit_post(user=current_user, post=post):
        flash(_("You do not have the permissions to edit this post."),
              "danger")
        return redirect(post.topic.url)

    form = ReplyForm()
    if form.validate_on_submit():
        if "preview" in request.form:
            return render_template(
                "forum/new_post.html", topic=post.topic,
                form=form, preview=form.content.data
            )
        else:
            form.populate_obj(post)
            post.date_modified = datetime.datetime.utcnow()
            post.modified_by = current_user.username
            post.save()
            return redirect(post.topic.url)
    else:
        form.content.data = post.content

    return render_template("forum/forum/new_post.html", topic=post.topic, form=form)


@forum.route("/post/<int:post_id>/delete", methods=["POST"])
@login_required
def delete_post(post_id):
    post = Post.query.filter_by(id=post_id).first_or_404()

    # TODO: Bulk delete

    if not can_delete_post(user=current_user, post=post):
        flash(_("You do not have the permissions to delete this post."),
              "danger")
        return redirect(post.topic.url)

    first_post = post.first_post
    topic_url = post.topic.url
    forum_url = post.topic.forum.url

    post.delete()

    # If the post was the first post in the topic, redirect to the forums
    if first_post:
        return redirect(forum_url)
    return redirect(topic_url)


@forum.route("/post/<int:post_id>/report", methods=["GET", "POST"])
@login_required
def report_post(post_id):
    post = Post.query.filter_by(id=post_id).first_or_404()

    form = ReportForm()
    if form.validate_on_submit():
        form.save(current_user, post)
        flash(_("Thanks for reporting."), "success")

    return render_template("forum/forum/report_post.html", form=form)


@forum.route("/post/<int:post_id>/raw", methods=["POST", "GET"])
@login_required
def raw_post(post_id):
    post = Post.query.filter_by(id=post_id).first_or_404()
    return format_quote(username=post.username, content=post.content)


@forum.route("/<int:forum_id>/markread", methods=["POST"])
@forum.route("/<int:forum_id>-<slug>/markread", methods=["POST"])
@login_required
def markread(forum_id=None, slug=None):
    # Mark a single forum as read
    if forum_id:
        forum_instance = Forum.query.filter_by(id=forum_id).first_or_404()
        forumsread = ForumsRead.query.filter_by(
            user_id=current_user.id, forum_id=forum_instance.id
        ).first()
        TopicsRead.query.filter_by(user_id=current_user.id,
                                   forum_id=forum_instance.id).delete()

        if not forumsread:
            forumsread = ForumsRead()
            forumsread.user_id = current_user.id
            forumsread.forum_id = forum_instance.id

        forumsread.last_read = datetime.datetime.utcnow()
        forumsread.cleared = datetime.datetime.utcnow()

        db.session.add(forumsread)
        db.session.commit()

        flash(_("Forum %(forum)s marked as read.", forum=forum_instance.title),
              "success")

        return redirect(forum_instance.url)

    # Mark all forums as read
    ForumsRead.query.filter_by(user_id=current_user.id).delete()
    TopicsRead.query.filter_by(user_id=current_user.id).delete()

    forums = Forum.query.all()
    forumsread_list = []
    for forum_instance in forums:
        forumsread = ForumsRead()
        forumsread.user_id = current_user.id
        forumsread.forum_id = forum_instance.id
        forumsread.last_read = datetime.datetime.utcnow()
        forumsread.cleared = datetime.datetime.utcnow()
        forumsread_list.append(forumsread)

    db.session.add_all(forumsread_list)
    db.session.commit()

    flash(_("All forums marked as read."), "success")

    return redirect(url_for("forum.index"))


@forum.route("/who-is-online")
def who_is_online():
    online_users = User.query.filter(User.lastseen >= time_diff()).all()
    return render_template("forum/forum/online_users.html",
                           online_users=online_users)


@forum.route("/memberlist", methods=['GET', 'POST'])
def memberlist():
    page = request.args.get('page', 1, type=int)

    search_form = UserSearchForm()

    if search_form.validate():
        users = search_form.get_results().\
            paginate(page, flaskbb_config['USERS_PER_PAGE'], False)
        return render_template("forum/forum/memberlist.html", users=users,
                               search_form=search_form)
    else:
        users = User.query.\
            paginate(page, flaskbb_config['USERS_PER_PAGE'], False)
        return render_template("forum/forum/memberlist.html", users=users,
                               search_form=search_form)


@forum.route("/topictracker")
@login_required
def topictracker():
    page = request.args.get("page", 1, type=int)
    topics = current_user.tracked_topics.\
        outerjoin(TopicsRead,
                  db.and_(TopicsRead.topic_id == Topic.id,
                          TopicsRead.user_id == current_user.id)).\
        add_entity(TopicsRead).\
        order_by(Topic.last_updated.desc()).\
        paginate(page, flaskbb_config['TOPICS_PER_PAGE'], True)

    return render_template("forum/forum/topictracker.html", topics=topics)


@forum.route("/topictracker/<int:topic_id>/add", methods=["POST"])
@forum.route("/topictracker/<int:topic_id>-<slug>/add", methods=["POST"])
@login_required
def track_topic(topic_id, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()
    current_user.track_topic(topic)
    current_user.save()
    return redirect(topic.url)


@forum.route("/topictracker/<int:topic_id>/delete", methods=["POST"])
@forum.route("/topictracker/<int:topic_id>-<slug>/delete", methods=["POST"])
@login_required
def untrack_topic(topic_id, slug=None):
    topic = Topic.query.filter_by(id=topic_id).first_or_404()
    current_user.untrack_topic(topic)
    current_user.save()
    return redirect(topic.url)


@forum.route("/search", methods=['GET', 'POST'])
def search():
    form = SearchPageForm()

    if form.validate_on_submit():
        result = form.get_results()
        return render_template('forum/search_result.html', form=form,
                               result=result)

    return render_template('forum/forum/search_form.html', form=form)
