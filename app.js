const CATEGORIES = ["Science Sense", "Logical Thinking", "Design Thinking", "Computing", "Maker Mindset"];
    const PER_CATEGORY = 4;
    const letters = ["A", "B", "C", "D"];
    const $ = (id) => document.getElementById(id);
    const state = { questions: [], index: 0, answers: [], checked: false, mode: "practice" };

    function shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    function buildSet() {
      let picked = shuffle(CATEGORIES.flatMap(category =>
        shuffle(BANK.filter(item => item.c === category)).slice(0, PER_CATEGORY)
      ));
      const signatureOf = questions => questions.map(item => item.q).sort().join("||");
      let previousSignature = "";
      try { previousSignature = localStorage.getItem("atlPreviousQuestionSet") || ""; } catch (_) {}

      if (signatureOf(picked) === previousSignature) {
        const first = picked[0];
        const used = new Set(picked.map(item => item.q));
        const replacement = BANK.find(item => item.c === first.c && !used.has(item.q));
        if (replacement) picked[0] = replacement;
        picked = shuffle(picked);
      }

      try { localStorage.setItem("atlPreviousQuestionSet", signatureOf(picked)); } catch (_) {}
      return picked;
    }

    function showOnly(id) {
      ["startScreen", "questionScreen", "resultScreen", "reviewScreen"].forEach(name =>
        $(name).classList.toggle("hidden", name !== id)
      );
    }

    function startQuiz() {
      state.questions = buildSet();
      state.index = 0;
      state.answers = Array(state.questions.length).fill(null);
      state.checked = false;
      state.mode = document.querySelector('input[name="mode"]:checked').value;
      $("quizSubtitle").textContent = state.mode === "practice"
        ? "Practice mode · 20 of 100 questions · explanations after every answer"
        : "Exam mode · 20 of 100 questions · a different set every attempt";
      $("scoreChip").textContent = "Score 0";
      showOnly("questionScreen");
      renderQuestion();
    }

    function renderQuestion() {
      state.checked = false;
      const item = state.questions[state.index];
      const saved = state.answers[state.index];
      $("categoryTag").textContent = item.c;
      $("questionCount").textContent = `Question ${state.index + 1} of ${state.questions.length}`;
      $("questionText").textContent = item.q;
      $("feedback").classList.add("hidden");
      $("nextBtn").textContent = "Check answer";
      $("nextBtn").disabled = saved === null;
      $("skipBtn").textContent = state.index === state.questions.length - 1 ? "Finish later" : "Skip for now";
      $("progressBar").style.width = `${(state.index / state.questions.length) * 100}%`;
      $("options").innerHTML = "";

      item.o.forEach((text, i) => {
        const button = document.createElement("button");
        button.className = "option" + (saved === i ? " selected" : "");
        button.type = "button";
        button.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${text}</span>`;
        button.addEventListener("click", () => selectOption(i));
        $("options").appendChild(button);
      });
    }

    function selectOption(index) {
      if (state.checked) return;
      state.answers[state.index] = index;
      [...$("options").children].forEach((node, i) => node.classList.toggle("selected", i === index));
      $("nextBtn").disabled = false;
    }

    function checkOrNext() {
      const item = state.questions[state.index];
      const chosen = state.answers[state.index];
      if (!state.checked) {
        if (chosen === null) return;
        state.checked = true;
        [...$("options").children].forEach((node, i) => {
          node.disabled = true;
          if (i === item.a) node.classList.add("correct");
          if (i === chosen && chosen !== item.a) node.classList.add("wrong");
        });
        if (state.mode === "practice") {
          $("feedback").innerHTML = `<strong>${chosen === item.a ? "Correct! 🎉" : "Good try."}</strong> ${item.e}`;
          $("feedback").classList.remove("hidden");
        }
        const correct = state.answers.reduce((sum, answer, i) => sum + (answer === state.questions[i].a ? 1 : 0), 0);
        $("scoreChip").textContent = `Score ${correct}`;
        $("nextBtn").textContent = state.index === state.questions.length - 1 ? "See my result" : "Next question →";
      } else {
        advance();
      }
    }

    function advance() {
      if (state.index < state.questions.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        showResult();
      }
    }

    function skipQuestion() {
      if (state.index < state.questions.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        const unanswered = state.answers.findIndex(answer => answer === null);
        if (unanswered >= 0) {
          state.index = unanswered;
          renderQuestion();
        } else {
          showResult();
        }
      }
    }

    function showResult() {
      const total = state.questions.length;
      const score = state.answers.reduce((sum, answer, i) => sum + (answer === state.questions[i].a ? 1 : 0), 0);
      const pct = Math.round(score / total * 100);
      const name = $("studentName").value.trim();
      $("finalScore").textContent = `${score}/${total}`;
      $("percentage").textContent = `${pct}%`;
      $("scoreRing").style.setProperty("--score-angle", `${pct * 3.6}deg`);
      $("progressBar").style.width = "100%";
      $("scoreChip").textContent = `${pct}%`;

      let title, message;
      if (pct >= 90) {
        title = "Outstanding innovator! 🚀";
        message = "Your reasoning is careful, practical and user-focused. Keep building and explaining your ideas.";
      } else if (pct >= 75) {
        title = "Strong tinkerer! 🌟";
        message = "You have a very good foundation. Review the weakest category and try another set.";
      } else if (pct >= 55) {
        title = "Promising explorer! 🔧";
        message = "You are thinking in the right direction. Explanations and small home prototypes will sharpen your skills.";
      } else {
        title = "Every maker starts here! 🌱";
        message = "Treat each missed answer as a clue. Review, test ideas with real objects, and try again.";
      }
      $("resultTitle").textContent = name ? `${name}, ${title.charAt(0).toLowerCase()}${title.slice(1)}` : title;
      $("resultMessage").textContent = message;

      const categoryScores = CATEGORIES.map(category => {
        const indices = state.questions.map((q, i) => q.c === category ? i : -1).filter(i => i >= 0);
        const correct = indices.filter(i => state.answers[i] === state.questions[i].a).length;
        return { category, correct, total: indices.length };
      });

      $("breakdown").innerHTML = categoryScores.map(item =>
        `<div class="break-item"><b>${item.correct}/${item.total}</b><small>${item.category}</small></div>`
      ).join("");

      const weakest = [...categoryScores].sort((a, b) => (a.correct / a.total) - (b.correct / b.total))[0];
      const advice = {
        "Science Sense": "Try small fair tests: change one thing, measure what happens, and explain why.",
        "Logical Thinking": "Practise number patterns, conditions, classification and explaining each step aloud.",
        "Design Thinking": "Start with the user: observe, ask, define the need, prototype, test and improve.",
        "Computing": "Practise algorithms, loops, IF–THEN rules, flowcharts, sensors and step-by-step debugging.",
        "Maker Mindset": "Build with simple materials, welcome feedback, work safely and describe what failure taught you."
      };
      $("focusTip").innerHTML = `<strong>Best next focus: ${weakest.category}.</strong> ${advice[weakest.category]}`;
      showOnly("resultScreen");
    }

    function showReview() {
      $("reviewList").innerHTML = state.questions.map((item, i) => {
        const chosen = state.answers[i];
        const correct = chosen === item.a;
        return `<article class="feedback" style="margin-bottom:12px">
          <strong>${i + 1}. ${correct ? "✓" : "✗"} ${item.q}</strong><br>
          Your answer: ${chosen === null ? "Not answered" : item.o[chosen]}<br>
          Correct answer: ${item.o[item.a]}<br>
          <span>${item.e}</span>
        </article>`;
      }).join("");
      showOnly("reviewScreen");
      window.scrollTo({ top: $("quizHeading").offsetTop, behavior: "smooth" });
    }

    function updateCourseProgress() {
      const lessons = [...document.querySelectorAll(".lesson")];
      const completed = lessons.filter(lesson => lesson.classList.contains("done")).length;
      $("courseProgressText").textContent = `${completed} of ${lessons.length} lessons`;
      $("courseProgressBar").style.width = `${(completed / lessons.length) * 100}%`;
      $("courseFinish").classList.toggle("show", completed === lessons.length);
    }

    document.querySelectorAll(".reveal").forEach(button => {
      button.addEventListener("click", () => {
        const answer = button.nextElementSibling;
        answer.classList.remove("hidden");
        button.classList.add("hidden");
      });
    });

    document.querySelectorAll(".complete-lesson").forEach((button, index, buttons) => {
      button.addEventListener("click", () => {
        const lesson = button.closest(".lesson");
        lesson.classList.add("done");
        button.textContent = "✓ Lesson complete";
        button.disabled = true;
        updateCourseProgress();
        setTimeout(() => {
          lesson.open = false;
          const nextLesson = lesson.nextElementSibling;
          if (nextLesson && nextLesson.matches(".lesson")) {
            nextLesson.open = true;
            nextLesson.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            $("courseFinish").scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 350);
      });
    });

    updateCourseProgress();
    $("startBtn").addEventListener("click", startQuiz);
    $("nextBtn").addEventListener("click", checkOrNext);
    $("skipBtn").addEventListener("click", skipQuestion);
    $("retryBtn").addEventListener("click", startQuiz);
    $("reviewBtn").addEventListener("click", showReview);
    $("backToResultBtn").addEventListener("click", () => showOnly("resultScreen"));
    $("printBtn").addEventListener("click", () => window.print());
