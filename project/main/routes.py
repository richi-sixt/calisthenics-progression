from flask import render_template, flash, redirect, url_for, request, jsonify, abort
from flask_login import current_user, login_required
from datetime import datetime
from project import db, app
from project.models import User, Workout, Exercises, Exercise, Set, Message, Notification
from project.main import bp
from project.main.forms import MessageForm, CreateExerciseForm
from project.decorators import check_confirmed


# helper functions
@bp.before_app_request
def before_request():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.utcnow()
        db.session.commit()

# routes

@bp.route("/", methods=['GET', 'POST'] )
@bp.route("/index", methods=['GET', 'POST'])
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.workouts'))
    return render_template('index.html', title='Home')

@bp.route("/workouts", methods=['GET', 'POST'])
@login_required
def workouts():
    page = request.args.get('page', 1, type=int)
    workouts = Workout.query.filter_by(user_id=current_user.get_id()).order_by(Workout.timestamp.desc()).paginate(page, app.config['WORKOUTS_PER_PAGE'], False)
    next_url = url_for('main.index', page=workouts.next_num) if workouts.has_next else None
    prev_url = url_for('main.index', page=workouts.prev_num) if workouts.has_prev else None
    return render_template('workouts.html', title='Home', workouts=workouts.items, next_url=next_url, prev_url=prev_url)

@bp.route('/add_workout', methods=['POST', 'GET'])
@login_required
@check_confirmed
def add_workout():
    if request.method == 'POST':
        user = current_user

        workout = Workout(timestamp=datetime.utcnow(), user_id=user.id, title=request.form['wtitle'])

        exercise_count = int(request.form['exercise_count'])

        for exercise_num in range(1,exercise_count + 1):
            exercise = Exercise(exercise_order=exercise_num, exercise2exercises_id=request.form['exercise'+str(exercise_num)], workout=workout)

            progressions = request.form.getlist('progression' + str(exercise_num))
            reps = request.form.getlist('reps' + str(exercise_num))
            db.session.add(workout)
            exercise = Exercise.query.order_by(Exercise.id.desc()).first()
            set_order = 1
            for progression, rep in zip(progressions, reps):
                work_set = Set(set_order=set_order, exercise=exercise, progression=progression, reps=rep)
                set_order += 1

        db.session.add(work_set)
        db.session.commit()

        return redirect(url_for('main.index'))
    exercises = Exercises.query.all()
    return render_template('add_workout.html', exercises=exercises)

@bp.route("/workout/<int:workout_id>")
@login_required
@check_confirmed
def workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    return render_template('workout.html', title=workout.title, workout=workout)

@bp.route("/workout/<int:workout_id>/delete", methods=['POST'])
@login_required
@check_confirmed
def delete_workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    if workout.athlet != current_user:
        abort(403)
    db.session.delete(workout)
    db.session.commit()
    flash('Dein Workout wurde gelöscht!', 'success')
    return render_template('workouts.html', title=workout.title, workout=workout)


@bp.route("/add_exercise", methods=['GET', 'POST'])
@login_required
@check_confirmed
def add_exercise():
    form = CreateExerciseForm()
    if form.validate_on_submit():
        exercise = Exercises(title=form.title.data, description=form.description.data, athlet=current_user)
        db.session.add(exercise)
        db.session.commit()
        flash('Deie Übung wurde erstellt!', 'success')
        return redirect(url_for('main.all_exercises'))
    return render_template('add_exercise.html', title='Neue Übung',
                           form=form, legend='Neue Übung')

@bp.route("/exercises/<int:exercises_id>")
@login_required
@check_confirmed
def exercise(exercises_id):
    exercise = Exercises.query.get_or_404(exercises_id)
    return render_template('exercise.html', title=exercise.title, exercise=exercise)

@bp.route("/exercises", methods=['GET'])
@login_required
@check_confirmed
def all_exercises():
    page = request.args.get('page', 1, type=int)
    exercises = Exercises.query.order_by(Exercises.title.asc()).paginate(page, app.config['WORKOUTS_PER_PAGE'], False)
    next_url = url_for('main.index', page=exercises.next_num) if exercises.has_next else None
    prev_url = url_for('main.index', page=exercises.prev_num) if exercises.has_prev else None
    return render_template('exercises.html', title='Alle Übungen', exercises=exercises.items, next_url=next_url, prev_url=prev_url)

@bp.route("/exercise/<int:exercises_id>/update", methods=['GET', 'POST'])
@login_required
@check_confirmed
def update_exercise(exercises_id):
    exercise = Exercises.query.get_or_404(exercises_id)
    if exercise.athlet != current_user:
        abort(403)
    form = CreateExerciseForm()
    if form.validate_on_submit():
        exercise.title = form.title.data
        exercise.description = form.description.data
        db.session.commit()
        flash('Deine Übung wurde geändert', 'success')
        return redirect(url_for('main.exercise', exercises_id=exercise.id))
    elif request.method == 'GET':
        form.title.data = exercise.title
        form.description.data = exercise.description
    return render_template('add_exercise.html', title='Ändere Übung',
                           form=form, legend='Ändere Übung')

@bp.route("/exercise/<int:exercises_id>/delete", methods=['POST'])
@login_required
@check_confirmed
def delete_exercise(exercises_id):
    exercise = Exercises.query.get_or_404(exercises_id)
    if exercise.athlet != current_user:
        abort(403)
    db.session.delete(exercise)
    db.session.commit()
    flash('Deine Übung wurde gelöscht!', 'success')
    return render_template('exercises.html', title=exercise.title, exercise=exercise)

@bp.route('/explore')
@login_required
@check_confirmed
def explore():
    page = request.args.get('page', 1, type=int)
    workouts = Workout.query.filter(Workout.user_id != current_user.id).order_by(Workout.timestamp.desc()).paginate(page, app.config['WORKOUTS_PER_PAGE'], False)
    next_url = url_for('main.explore', page=workouts.next_num) if workouts.has_next else None
    prev_url = url_for('main.explore', page=workouts.prev_num) if workouts.has_prev else None
    return render_template('explore.html', title='Explore', workouts=workouts.items, next_url=next_url, prev_url=prev_url)

@bp.route('/user/<username>')
@login_required
@check_confirmed
def user(username):
    user = User.query.filter_by(username=username) .first_or_404()
    page = request.args.get('page', 1, type=int)
    workouts = user.workouts.order_by(Workout.timestamp.desc()).paginate(page, app.config['WORKOUTS_PER_PAGE'], False)
    next_url = url_for('main.user', username=user.username, page=workouts.next_num) \
        if workouts.has_next else None
    prev_url = url_for('main.user', username=user.username, page=workouts.prev_num) \
        if workouts.has_prev else None
    image_file = url_for('static', filename='profile_pics/' + user.image_file)
    return render_template('user.html', user=user, image_file=image_file, workouts=workouts.items, next_url=next_url, prev_url=prev_url)

@bp.route('/follow/<username>')
@login_required
@check_confirmed
def follow(username):
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash('Benutzer {} konnte nicht gefunden werden.'.format(username))
        return redirect(url_for('main.index'))
    if user == current_user:
        flash('Du kannst dir nicht selber folgen.')
        return redirect(url_for('main.user', username=username))
    current_user.follow(user)
    db.session.commit()
    flash('Du folgst {}!'.format(username))
    return redirect(url_for('main.user', username=username))

@bp.route('/unfollow/<username>')
@login_required
@check_confirmed
def unfollow(username):
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash('Benutzer {} konnte nicht gefunden werden.'.format(username))
        return redirect(url_for('main.index'))
    if user == current_user:
        flash('Du kannst dir nicht selber entfolgen')
        return redirect(url_for('main.user', username=username))
    current_user.unfollow(user)
    db.session.commit()
    flash('Du folgst {} nicht.'.format(username))
    return redirect(url_for('main.user', username=username))

@bp.route('/messages')
@login_required
@check_confirmed
def messages():
    current_user.last_message_read_time = datetime.utcnow()
    current_user.add_notification('unread_message_count', 0)
    db.session.commit()
    page = request.args.get('page', 1, type=int)
    messages = current_user.messages_received.order_by(Message.timestamp.desc()).paginate(page, app.config['WORKOUTS_PER_PAGE'], False)
    next_url = url_for('main.messages', page=messages.next_num) \
        if messages.has_next else None
    prev_url = url_for('main.messages', page=messages.prev_num) \
        if messages.has_prev else None
    return render_template('messages.html', messages=messages.items, next_url=next_url, prev_url=prev_url)

@bp.route('/send_message/<recipient>', methods=['GET', 'POST'])
@login_required
@check_confirmed
def send_message(recipient):
    user = User.query.filter_by(username=recipient).first_or_404()
    form = MessageForm()
    if form.validate_on_submit():
        msg = Message(athlet=current_user, recipient=user, body=form.message.data)
        db.session.add(msg)
        user.add_notification('unread_message_count', user.new_messages())
        db.session.commit()
        flash('Deine Nachricht wurde gesendet.')
        return redirect(url_for('main.user', username=recipient))
    return render_template('send_message.html', title='Nachricht senden', form=form, recipient=recipient)

@bp.route('/notifications')
@login_required
@check_confirmed
def notifications():
    since = request.args.get('since', 0.0, type=float)
    notifications = current_user.notifications.filter(
        Notification.timestamp > since).order_by(Notification.timestamp.asc())
    return jsonify([{
        'name': n.name,
        'data': n.get_data(),
        'timestamp': n.timestamp
    } for n in notifications])