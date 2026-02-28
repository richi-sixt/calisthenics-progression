$(document).ready(function() {

    // Only compile workout templates on pages that have them
    if ($("#exercise_template").length) {
    exercise_template = _.template($("#exercise_template").html());
    set_reps_template = _.template($("#set_reps_template").html());
    set_duration_template = _.template($("#set_duration_template").html());
  }
    // Get the counting type for an exercise select
    window.getCountingType = function(select) {
        var selectedOption = select.find("option:selected");
        return selectedOption.data("counting-type") || "reps";
    };

    // Get the progression levels for the currently selected exercise
    window.getLevelsForExercise = function(select) {
        var exerciseId = select.val();
        return (typeof progressionMap !== "undefined" && progressionMap[exerciseId]) ? progressionMap[exerciseId] : [];
    };

    // Get the correct set template based on counting type and levels
    window.getSetTemplate = function(countingType, exerciseNum, levels) {
        levels = levels || [];
        if (countingType === "duration") {
            return set_duration_template({exercise_num: exerciseNum, levels: levels});
        }
        return set_reps_template({exercise_num: exerciseNum, levels: levels});
    };

    // Store original options for each select to restore later
    window.storeOriginalOptions = function(select) {
        if (!select.data("originalOtherOptions")) {
            var otherOptions = select.find("optgroup.other-exercises option").clone(true);
            select.data("originalOtherOptions", otherOptions);
        }
        if (!select.data("originalMyOptions")) {
            var myOptions = select.find("optgroup.my-exercises option").clone(true);
            select.data("originalMyOptions", myOptions);
        }
    };

    // Get all active category chip IDs (returns [] when "Alle" is selected)
    window.getActiveCategoryIds = function() {
        var ids = [];
        $(".category-chip").each(function() {
            var catId = parseInt($(this).data("cat-id"));
            if (catId !== 0 && $(this).hasClass("bg-secondary")) {
                ids.push(catId);
            }
        });
        return ids;
    };

    // Initialize all existing selects
    $(".exercise-select").each(function() {
        storeOriginalOptions($(this));
    });

    // Toggle filter for exercises - apply user filter and/or category filter
    window.applyExerciseFilter = function applyExerciseFilter() {
        var showOnlyMine = $("#showOnlyMine").is(":checked");
        var activeCatIds = (typeof getActiveCategoryIds === "function") ? getActiveCategoryIds() : [];

        $(".exercise-select").each(function() {
            var select = $(this);
            var myOptgroup = select.find("optgroup.my-exercises");
            var otherOptgroup = select.find("optgroup.other-exercises");

            // Store original options if not already stored
            storeOriginalOptions(select);

            // Restore both optgroups from stored originalqs before re-applying applyExerciseFilter
            var currentValue = select.val();
            var originalMyOptions = select.data("originalMyOptions");
            var originalOtherOptions = select.data("originalOtherOptions");
            if (originalMyOptions) {
                myOptgroup.empty().append(originalMyOptions.clone(true));
            }
            if (originalOtherOptions) {
                otherOptgroup.empty().append(originalOtherOptions.clone(true));
            }
            if (currentValue !== null) {select.val(currentValue); }

            // Apply user filter: remove "other" options entirely
            if (showOnlyMine) {
                otherOptgroup.empty();
            }

            // Apply category filter: remove options not matching any active category
            if (activeCatIds.length > 0 && typeof categoryMap !== "undefined") {
                var catFilterFn = function() {
                    var exId = parseInt($(this).val());
                    return !(categoryMap[exId] && activeCatIds.every(function(catId) {
                        return categoryMap[exId].indexOf(catId) !== -1;
                    }));
                };
                myOptgroup.find("option").filter(catFilterFn).remove();
                if (!showOnlyMine) {
                    otherOptgroup.find("option").filter(catFilterFn).remove();
                }
            }

            // Fix selection if currently selected option was removed
            if (select.find("option:selected").length === 0 || select.val() === null) {
                var firstAvailable = select.find("option:first");
                if (firstAvailable.length) {
                    select.val(firstAvailable.val());
                    rebuildSetsForExercise(select);
                }
            }

            updateCopyButton(select);
        });
    };

    // Show/hide copy button based on selected exercise
    window.updateCopyButton = function updateCopyButton(select) {
        var selectedOption = select.find("option:selected");
        var copyBtn = select.closest(".exercise-select-wrapper").find(".copy-exercise-btn");

        if (selectedOption.data("owner") === "other") {
            copyBtn.show();
        } else {
            copyBtn.hide();
        }
    };

     // Rebuild sets when exercise selection changes
    function rebuildSetsForExercise(select) {
        var exerciseName = select.attr("name");
        var exerciseNum = exerciseName.replace("exercise", "");
        var setsContainer = $("#exercise" + exerciseNum);
        var countingType = getCountingType(select);
        var levels = getLevelsForExercise(select);

        // Clear existing sets and re-add one
        setsContainer.empty();
        setsContainer.append(getSetTemplate(countingType, exerciseNum, levels));
    }

    // Initial filter application
    applyExerciseFilter();

    // Add initial set for exercise 1
    var firstSelect = $("[name='exercise1']");
    if (firstSelect.length && $("#exercise1").children().length === 0) {
        rebuildSetsForExercise(firstSelect);
    }

    // Toggle change handler
    $("#showOnlyMine").on("change", function() {
        applyExerciseFilter();
    });

    // Category chip click handler (multi-select toggle, delegated for dynamic content)
    $(document).on("click", ".category-chip", function() {
        var catId = parseInt($(this).data("cat-id"));
        if (catId === 0) {
            // "Alle": deactivate all specific category chips
            $(".category-chip").removeClass("bg-secondary").addClass("bg-light");
            $(this).addClass("bg-secondary").removeClass("bg-light");
        } else {
            // Deactivate "Alle" chip
            $(".category-chip[data-cat-id='0']").removeClass("bg-secondary").addClass("bg-light");
            // Toggle this specific chip
            $(this).toggleClass("bg-secondary bg-light");
            // If no specific chip is active, reactivate "Alle"
            if ($(".category-chip:not([data-cat-id='0']).bg-secondary").length === 0) {
                $(".category-chip[data-cat-id='0']").addClass("bg-secondary").removeClass("bg-light");
            }
        }
        applyExerciseFilter();
    });

    // Exercise selection change handler
    $(document).on("change", ".exercise-select", function() {
        updateCopyButton($(this));
        rebuildSetsForExercise($(this));
    });

    // Copy exercise handler
    $(document).on("click", ".copy-exercise-btn", function() {
        var btn = $(this);
        var select = btn.closest(".exercise-select-wrapper").find(".exercise-select");
        var exerciseId = select.val();

        btn.prop("disabled", true).text("Kopiere...");

        $.ajax({
            url: "/copy_exercise/" + exerciseId,
            method: "POST",
            success: function(response) {
                // Add new option to all "my exercises" optgroups
                var newOption = '<option value="' + response.id + '" data-owner="mine" data-counting-type="' + response.counting_type + '">' + response.title + '</option>';
                $(".exercise-select optgroup.my-exercises").each(function() {
                    $(this).append(newOption);
                });

                // Register progression levels and categories for the copied exercise
                if (typeof progressionMap !== "undefined" && response.progression_levels) {
                    progressionMap[response.id] = response.progression_levels;
                }
                if (typeof categoryMap !== "undefined") {
                    categoryMap[response.id] = response.category_ids || [];
                }

                // Select the new exercise in this dropdown
                select.val(response.id);
                updateCopyButton(select);
                rebuildSetsForExercise(select);

                btn.text("Kopiert!");
                setTimeout(function() {
                    btn.text("Kopieren").prop("disabled", false);
                }, 1500);
            },
            error: function(xhr) {
                var error = xhr.responseJSON ? xhr.responseJSON.error : "Fehler beim Kopieren";
                alert(error);
                btn.text("Kopieren").prop("disabled", false);
            }
        });
    });

    // Renumber exercises after one is removed
    function renumberExercises() {
        var count = 0;
        $(".exercise-block").each(function(idx) {
            count = idx + 1;
            // Update select name
            $(this).find("select.exercise-select").attr("name", "exercise" + count);
            // Update sets container id
            $(this).find("[id^='exercise']").attr("id", "exercise" + count);
            // Update progression, reps, duration names inside sets container
            $(this).find("[name^='progression']").attr("name", "progression" + count);
            $(this).find("[name^='reps']").attr("name", "reps" + count);
            $(this).find("[name^='duration']").attr("name", "duration" + count);
            // Update addSet button exercise attribute
            $(this).find(".addSet").attr("exercise", count);
        });
        $("[name=exercise_count]").val(count);
    }

    // Remove a single set
    $(document).on("click", ".removeSet", function() {
        $(this).closest(".set-row").remove();
    });

    // Remove an entire exercise block
    $(document).on("click", ".removeExercise", function() {
        $(this).closest(".exercise-block").remove();
        renumberExercises();
    });

    // Add exercise handler
    $("#addExercise").on("click", function() {
        exercise_num = $(".exercise-block").length + 1;
        $("[name=exercise_count]").val(exercise_num);

        exercise_compiled = exercise_template({exercise_num : exercise_num});

        $("#addExercise").before(exercise_compiled);

        // Store options and apply filter to newly added exercise select
        var newSelect = $("[name='exercise" + exercise_num + "']");
        storeOriginalOptions(newSelect);
        applyExerciseFilter();

    // Add initial set with correct type
        rebuildSetsForExercise(newSelect);
    });

    // Add set handler
    $(document).on("click", ".addSet", function() {
        exercise_num = Number($(this).attr("exercise"));
        var select = $("[name='exercise" + exercise_num + "']");
        var countingType = getCountingType(select);
        var levels = getLevelsForExercise(select);
        var set_compiled = getSetTemplate(countingType, exercise_num, levels);
        $("#exercise" + exercise_num).append(set_compiled);
    });

});
