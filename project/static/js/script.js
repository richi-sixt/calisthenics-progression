$(document).ready(function() {

    exercise_template = _.template($("#exercise_template").html());
    set_template = _.template($("#set_template").html());

    // Store original options for each select to restore later
    function storeOriginalOptions(select) {
        if (!select.data("originalOtherOptions")) {
            var otherOptions = select.find("optgroup.other-exercises option").clone(true);
            select.data("originalOtherOptions", otherOptions);
        }
    }

    // Initialize all existing selects
    $(".exercise-select").each(function() {
        storeOriginalOptions($(this));
    });

    // Toggle filter for exercises - remove/restore options
    function applyExerciseFilter() {
        var showOnlyMine = $("#showOnlyMine").is(":checked");

        $(".exercise-select").each(function() {
            var select = $(this);
            var otherOptgroup = select.find("optgroup.other-exercises");

            // Store original options if not already stored
            storeOriginalOptions(select);

            if (showOnlyMine) {
                // Check if currently selected option is from "other"
                var selectedOption = select.find("option:selected");
                var needsSwitch = selectedOption.data("owner") === "other";

                // Remove other athletes' options
                otherOptgroup.empty();

                // Switch to first "mine" option if needed
                if (needsSwitch) {
                    var firstMine = select.find("optgroup.my-exercises option:first");
                    if (firstMine.length) {
                        select.val(firstMine.val());
                    }
                }
            } else {
                // Restore other athletes' options
                var originalOptions = select.data("originalOtherOptions");
                if (originalOptions && otherOptgroup.children().length === 0) {
                    otherOptgroup.append(originalOptions.clone(true));
                }
            }

            updateCopyButton(select);
        });
    }

    // Show/hide copy button based on selected exercise
    function updateCopyButton(select) {
        var selectedOption = select.find("option:selected");
        var copyBtn = select.closest(".exercise-select-wrapper").find(".copy-exercise-btn");

        if (selectedOption.data("owner") === "other") {
            copyBtn.show();
        } else {
            copyBtn.hide();
        }
    }

    // Initial filter application
    applyExerciseFilter();

    // Toggle change handler
    $("#showOnlyMine").on("change", function() {
        applyExerciseFilter();
    });

    // Exercise selection change handler
    $(document).on("change", ".exercise-select", function() {
        updateCopyButton($(this));
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
                var newOption = '<option value="' + response.id + '" data-owner="mine">' + response.title + '</option>';
                $(".exercise-select optgroup.my-exercises").each(function() {
                    $(this).append(newOption);
                });

                // Select the new exercise in this dropdown
                select.val(response.id);
                updateCopyButton(select);

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

    // Add exercise handler
    $("#addExercise").on("click", function() {
        exercise_num = Number($("[name=exercise_count]").val()) + 1;
        $("[name=exercise_count]").val(exercise_num);

        exercise_compiled = exercise_template({exercise_num : exercise_num});
        set_compiled = set_template({exercise_num : exercise_num});

        $("#addExercise").before(exercise_compiled);
        $("#exercise" + exercise_num).append(set_compiled);

        // Store options and apply filter to newly added exercise select
        var newSelect = $("[name='exercise" + exercise_num + "']");
        storeOriginalOptions(newSelect);
        applyExerciseFilter();
    });

    // Add set handler
    $(document).on("click", ".addSet", function() {
        exercise_num = Number($(this).attr("exercise"));
        set_compiled = set_template({exercise_num : exercise_num});
        $("#exercise" + exercise_num).append(set_compiled);
    });

});
