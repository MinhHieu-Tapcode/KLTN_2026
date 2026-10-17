export interface ParseIeltsExamInput {
  title: string;
  skill: string;
  durationMinutes: number;
  audioUrl: string | null;
  excelAnswersRaw: string;
  pdfTextRaw: string;
}

export function parseIeltsExamContent(input: ParseIeltsExamInput) {
  const { title, skill, durationMinutes, audioUrl, excelAnswersRaw, pdfTextRaw } = input;

  let parsedQuestions: any[] = [];
  let passageText = "";

  if (pdfTextRaw.trim()) {
    passageText = pdfTextRaw.trim();
  } else if (skill === "READING") {
    passageText = `READING PASSAGE 1: URBAN BEEKEEPING: SWEET SUCCESS OR STICKY PROBLEM?
Paragraph A: Over the past decade, urban beekeeping has experienced an unprecedented boom. From London and Paris to New York and Melbourne, thousands of rooftop and backyard apiaries have sprung up. Driven by celebrity endorsements, corporate sustainability initiatives, and well-meaning citizens wishing to 'save the bees', metropolitan hives have proliferated at remarkable speed. In Greater London alone, the number of registered beehives surged from roughly 1,000 in 2007 to over 5,000 by 2021.

Paragraph B: Advocates point to several compelling advantages. City honey, surprisingly, often contains fewer pesticide residues than its rural counterpart, where agricultural chemical spraying is pervasive. Moreover, diverse urban flora — from balcony geraniums and roadside lime trees to botanical gardens — provides a nectar source that can span from early spring through late autumn. Studies have even noted that urban honey yields per hive can match or exceed rural averages.

Paragraph C: However, entomologists and conservation biologists urge caution. The primary concern is that managed honeybees (Apis mellifera) are not an endangered species; rather, they are an agricultural animal. When urban centres become oversaturated with managed hives, intense competition erupts between commercial honeybees and wild pollinators — such as bumblebees, solitary bees, and hoverflies — which are already experiencing precipitous population declines.

Paragraph D: Furthermore, disease transmission between hives poses a grave danger in densely populated urban settings. Pathogens like the deformed wing virus and parasites such as the Varroa destructor mite spread rapidly between neighbouring colonies when floral resources are shared.

Paragraph E: To address these challenges, several European cities have begun implementing evidence-based regulations. In Brussels, local authorities advise against installing new hives in zones with low floral density, encouraging instead the creation of wildflower meadows. The consensus emerging among bee researchers is clear: keeping honeybees is an engaging agricultural hobby, but it must not be conflated with the conservation of wild pollinators.`;
  } else if (skill === "LISTENING") {
    passageText = `IELTS LISTENING SECTION 1: RIVERSIDE SPORTS CLUB
Audio Track: IELTS Mini Practice Test - Section 1 Form Completion
Scenario: Listen to a telephone conversation between a clerk at the Riverside Sports Club and a prospective member, Arthur Baxter.
Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.

RIVERSIDE SPORTS CLUB - MEMBERSHIP APPLICATION FORM
Applicant Details:
First name: Arthur
Surname: [Question 1]
Address: 42 [Question 2] Road, Highbury
Postcode: KL9 [Question 3]
Contact telephone: 07700 900 [Question 4]

Membership & Facility Preferences:
Type of membership required: [Question 5]
Cost of membership per month: £ [Question 6]
Health & fitness notes: Suffered from an injury to his [Question 7] last year
Induction session booked for: Saturday at [Question 8] with Maria`;
  } else if (skill === "WRITING") {
    passageText = `IELTS WRITING TASK 2: ACADEMIC ESSAY
You should spend about 40 minutes on this task.
Write about the following topic:

Some people think that governments should spend money on improving public transport rather than building new roads.
To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.
Write at least 250 words.`;
  } else {
    passageText = `IELTS SPEAKING PART 2 & PART 3: TOPIC - A MEMORABLE TRIP
Candidate Cue Card:
Describe a journey you made that you remember well.
You should say:
- Where you went and who you went with
- How you traveled
- Why you made this trip
And explain why this journey was particularly memorable to you.`;
  }

  if (excelAnswersRaw.trim()) {
    try {
      const rows = JSON.parse(excelAnswersRaw);
      if (Array.isArray(rows)) {
        parsedQuestions = rows.map((r, idx) => ({
          questionNumber: r.questionNumber || idx + 1,
          passageText: r.passageText || null,
          prompt: r.prompt || `Câu hỏi số ${idx + 1}: ${r.content || "Chọn đáp án đúng"}`,
          type: r.type || "MULTIPLE_CHOICE",
          points: Number(r.points) || 1.0,
          correctAnswer: String(r.correctAnswer || "A").trim().toUpperCase(),
          explanation: r.explanation || "Giải thích dựa trên nội dung đề bài",
          options: r.options || [
            { optionLabel: "A", content: "Đáp án A", isCorrect: r.correctAnswer === "A" },
            { optionLabel: "B", content: "Đáp án B", isCorrect: r.correctAnswer === "B" },
            { optionLabel: "C", content: "Đáp án C", isCorrect: r.correctAnswer === "C" },
            { optionLabel: "D", content: "Đáp án D", isCorrect: r.correctAnswer === "D" },
          ],
        }));
      }
    } catch {
      console.warn("Could not parse excelAnswersRaw as JSON, using auto generation");
    }
  }

  if (parsedQuestions.length === 0) {
    if (skill === "READING") {
      parsedQuestions = [
        {
          questionNumber: 1,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph A",
          prompt: "The number of hives in London has more than doubled since 2007.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "TRUE",
          explanation: "Paragraph A states hives surged from roughly 1,000 in 2007 to over 5,000 by 2021 (a fivefold increase).",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: true },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 2,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph B",
          prompt: "Honey from city hives tastes more consistent than honey from the countryside.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "FALSE",
          explanation: "Paragraph B states diverse flora creates varied, not more consistent, honey flavours.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: false },
            { optionLabel: "B", content: "FALSE", isCorrect: true },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 3,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph C",
          prompt: "Honeybees can threaten wild pollinators by competing with them for food.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "TRUE",
          explanation: "Paragraph C explicitly highlights intense competition between commercial honeybees and wild pollinators.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: true },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 4,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph A",
          prompt: "Employees who join company hive schemes are given a share of the honey.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "NOT GIVEN",
          explanation: "Paragraph A mentions corporate sustainability schemes, but no details about giving honey to employees.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: false },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: true },
          ],
        },
        {
          questionNumber: 5,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph B",
          prompt: "What is sprayed on farm crops that can harm bee colonies? (NO MORE THAN TWO WORDS)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "pesticides",
          explanation: "Paragraph B: City honey contains fewer 'pesticide residues' / pesticides.",
          options: [],
        },
        {
          questionNumber: 6,
          passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph E",
          prompt: "What does Brussels encourage people to plant on unused land? (NO MORE THAN TWO WORDS)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "wildflower meadows",
          explanation: "Paragraph E: '...encouraging instead the creation of wildflower meadows.'",
          options: [],
        },
        {
          questionNumber: 7,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph A",
          prompt: "According to paragraph A, melatonin in teenagers is released:",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "C",
          explanation: "Paragraph A notes that during puberty, circadian rhythms shift so melatonin is released later than in childhood.",
          options: [
            { optionLabel: "A", content: "in smaller amounts than in adults", isCorrect: false },
            { optionLabel: "B", content: "earlier in the evening than in adults", isCorrect: false },
            { optionLabel: "C", content: "later than in childhood", isCorrect: true },
            { optionLabel: "D", content: "only after midnight", isCorrect: false },
          ],
        },
        {
          questionNumber: 8,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph C",
          prompt: "Which of the following is NOT mentioned as a difficulty of later school start times?",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "C",
          explanation: "Paragraph C mentions bus schedules, sports, and working parents, but does NOT mention teachers' salaries.",
          options: [
            { optionLabel: "A", content: "bus timetables", isCorrect: false },
            { optionLabel: "B", content: "extracurricular sports", isCorrect: false },
            { optionLabel: "C", content: "teachers' salaries", isCorrect: true },
            { optionLabel: "D", content: "working parents' schedules", isCorrect: false },
          ],
        },
        {
          questionNumber: 9,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up",
          prompt: "What is the writer's main purpose in the passage?",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "B",
          explanation: "The passage objectively explores scientific evidence and practical implications of later school start times.",
          options: [
            { optionLabel: "A", content: "to criticize traditional education policies", isCorrect: false },
            { optionLabel: "B", content: "to explain the evidence for later school start times", isCorrect: true },
            { optionLabel: "C", content: "to advise parents on managing teenage bedtime routines", isCorrect: false },
            { optionLabel: "D", content: "to compare sleep patterns across different age groups", isCorrect: false },
          ],
        },
        {
          questionNumber: 10,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph B",
          prompt: "In the trial, fewer pupils arrived ______ to first lessons. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "late",
          explanation: "Paragraph B: Rates of chronic lateness fell sharply, meaning fewer pupils arrived late.",
          options: [],
        },
        {
          questionNumber: 11,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph D",
          prompt: "Sleep helps the brain with memory ______. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "consolidation",
          explanation: "Paragraph D explicitly identifies memory consolidation during deep sleep stages.",
          options: [],
        },
        {
          questionNumber: 12,
          passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph C",
          prompt: "Some districts solved transport problems by staggering start times between older pupils and ______ ones. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "younger",
          explanation: "Paragraph C: Districts staggered start times between older students and younger pupils.",
          options: [],
        },
      ];
    } else if (skill === "LISTENING") {
      parsedQuestions = [
        {
          questionNumber: 1,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Surname: _______ (Write NO MORE THAN TWO WORDS AND/OR A NUMBER)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Baxter",
          explanation: "Audio: Clerk asks for surname, applicant spells B-A-X-T-E-R.",
          options: [],
        },
        {
          questionNumber: 2,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Address: 42 _______ Road, Highbury",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Elm",
          explanation: "Audio: Applicant confirms address is 42 Elm Road.",
          options: [],
        },
        {
          questionNumber: 3,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Postcode: KL9 _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "4PT",
          explanation: "Audio: Postcode is confirmed as KL9 4PT.",
          options: [],
        },
        {
          questionNumber: 4,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Contact telephone: 07700 900 _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "238119",
          explanation: "Audio: Arthur gives phone number ending in 238119.",
          options: [],
        },
        {
          questionNumber: 5,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Type of membership required: _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Gold",
          explanation: "Audio: Arthur selects Gold membership for full gym and pool access.",
          options: [],
        },
        {
          questionNumber: 6,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Cost of membership per month: £ _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "45",
          explanation: "Audio: Monthly fee for Gold membership is forty-five pounds (£45).",
          options: [],
        },
        {
          questionNumber: 7,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Health & fitness note: Suffered from an injury to his _______ last year",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "back",
          explanation: "Audio: Arthur notes he injured his back and needs low-impact exercises.",
          options: [],
        },
        {
          questionNumber: 8,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Induction session booked for: Saturday at _______ with Maria",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "10.30 a.m.",
          explanation: "Audio: Induction appointment is set for 10.30 a.m. on Saturday.",
          options: [],
        },
      ];
    } else if (skill === "WRITING") {
      parsedQuestions = [
        {
          questionNumber: 1,
          passageText: "IELTS WRITING TASK 2: ACADEMIC ESSAY\nTopic: Public transport vs. building new roads.",
          prompt: "Viết bài luận hoàn chỉnh tối thiểu 250 từ cho chủ đề trên (Writing Task 2).",
          type: "ESSAY",
          points: 9.0,
          correctAnswer: "",
          explanation: "Chấm điểm trực tiếp bởi giáo viên theo 4 tiêu chí IELTS: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.",
          options: [],
        },
      ];
    } else if (skill === "ALL_SKILLS") {
      const readingPassage1Text = `READING PASSAGE 1: URBAN BEEKEEPING: SWEET SUCCESS OR STICKY PROBLEM?
Paragraph A: Over the past decade, urban beekeeping has experienced an unprecedented boom. From London and Paris to New York and Melbourne, thousands of rooftop and backyard apiaries have sprung up. Driven by celebrity endorsements, corporate sustainability initiatives, and well-meaning citizens wishing to 'save the bees', metropolitan hives have proliferated at remarkable speed. In Greater London alone, the number of registered beehives surged from roughly 1,000 in 2007 to over 5,000 by 2021.

Paragraph B: Advocates point to several compelling advantages. City honey, surprisingly, often contains fewer pesticide residues than its rural counterpart, where agricultural chemical spraying is pervasive. Moreover, diverse urban flora — from balcony geraniums and roadside lime trees to botanical gardens — provides a nectar source that can span from early spring through late autumn. Studies have even noted that urban honey yields per hive can match or exceed rural averages.

Paragraph C: However, entomologists and conservation biologists urge caution. The primary concern is that managed honeybees (Apis mellifera) are not an endangered species; rather, they are an agricultural animal. When urban centres become oversaturated with managed hives, intense competition erupts between commercial honeybees and wild pollinators — such as bumblebees, solitary bees, and hoverflies — which are already experiencing precipitous population declines.

Paragraph D: Furthermore, disease transmission between hives poses a grave danger in densely populated urban settings. Pathogens like the deformed wing virus and parasites such as the Varroa destructor mite spread rapidly between neighbouring colonies when floral resources are shared.

Paragraph E: To address these challenges, several European cities have begun implementing evidence-based regulations. In Brussels, local authorities advise against installing new hives in zones with low floral density, encouraging instead the creation of wildflower meadows. The consensus emerging among bee researchers is clear: keeping honeybees is an engaging agricultural hobby, but it must not be conflated with the conservation of wild pollinators.`;

      const readingQuestionsP1 = [
        {
          questionNumber: 1,
          passageText: "Urban Beekeeping - Paragraph A",
          prompt: "The number of hives in London has more than doubled since 2007.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "TRUE",
          explanation: "Paragraph A: Surged from roughly 1,000 to over 5,000 (fivefold increase).",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: true },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 2,
          passageText: "Urban Beekeeping - Paragraph B",
          prompt: "Honey from city hives tastes more consistent than honey from the countryside.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "FALSE",
          explanation: "Paragraph B explains urban honey tastes varied due to diverse plants, not more consistent.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: false },
            { optionLabel: "B", content: "FALSE", isCorrect: true },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 3,
          passageText: "Urban Beekeeping - Paragraph C",
          prompt: "Honeybees can threaten wild pollinators by competing with them for food.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "TRUE",
          explanation: "Paragraph C notes intense competition between commercial honeybees and wild pollinators.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: true },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
          ],
        },
        {
          questionNumber: 4,
          passageText: "Urban Beekeeping - Paragraph A",
          prompt: "Employees who join company hive schemes are given a share of the honey.",
          type: "TRUE_FALSE_NG",
          points: 1.0,
          correctAnswer: "NOT GIVEN",
          explanation: "Paragraph A mentions corporate initiatives, but no information about honey shares for staff.",
          options: [
            { optionLabel: "A", content: "TRUE", isCorrect: false },
            { optionLabel: "B", content: "FALSE", isCorrect: false },
            { optionLabel: "C", content: "NOT GIVEN", isCorrect: true },
          ],
        },
        {
          questionNumber: 5,
          passageText: "Urban Beekeeping - Paragraph B",
          prompt: "What is sprayed on farm crops that can harm bee colonies? (NO MORE THAN TWO WORDS)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "pesticides",
          explanation: "Paragraph B: 'fewer pesticide residues'.",
          options: [],
        },
        {
          questionNumber: 6,
          passageText: "Urban Beekeeping - Paragraph E",
          prompt: "What does Brussels encourage people to plant on unused land? (NO MORE THAN TWO WORDS)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "wildflower meadows",
          explanation: "Paragraph E: '...encouraging instead the creation of wildflower meadows.'",
          options: [],
        },
      ];

      const readingPassage2Text = `READING PASSAGE 2: WHY TEENAGERS STRUGGLE TO WAKE UP
Paragraph A: For generations, parents have accused teenagers of being lazy for sleeping through the morning. However, neuroscientists have proved that adolescent sleep patterns are driven by biology rather than attitude. During puberty, the circadian clock shifts: melatonin is released up to two hours later in the evening than in adults or young children.

Paragraph B: In a landmark study involving 40 secondary schools in the UK, shifting the school start time from 8:30 a.m. to 10:00 a.m. produced a noticeable improvement in GCSE grades. Rates of chronic lateness fell sharply, and student wellbeing scores improved markedly.

Paragraph C: Implementing delayed start times has not been without logistical friction. Difficulties cited include adjusting bus timetables, coordinating with working parents' schedules, and rescheduling extracurricular sports. Some districts solved this by staggering start times between older pupils and younger ones.

Paragraph D: As cognitive neuroscientists continue to map the adolescent brain, the consensus is clear: adequate sleep is vital for memory consolidation and emotional regulation.`;

      const readingQuestionsP2 = [
        {
          questionNumber: 7,
          passageText: "Why Teenagers Struggle to Wake Up - Paragraph A",
          prompt: "According to paragraph A, melatonin in teenagers is released:",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "C",
          explanation: "Paragraph A: Melatonin is released later than in childhood.",
          options: [
            { optionLabel: "A", content: "in smaller amounts than in adults", isCorrect: false },
            { optionLabel: "B", content: "earlier in the evening than in adults", isCorrect: false },
            { optionLabel: "C", content: "later than in childhood", isCorrect: true },
            { optionLabel: "D", content: "only after midnight", isCorrect: false },
          ],
        },
        {
          questionNumber: 8,
          passageText: "Why Teenagers Struggle to Wake Up - Paragraph C",
          prompt: "Which of the following is NOT mentioned as a difficulty of later school start times?",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "C",
          explanation: "Paragraph C does not mention teachers' salaries.",
          options: [
            { optionLabel: "A", content: "bus timetables", isCorrect: false },
            { optionLabel: "B", content: "extracurricular sports", isCorrect: false },
            { optionLabel: "C", content: "teachers' salaries", isCorrect: true },
            { optionLabel: "D", content: "working parents' schedules", isCorrect: false },
          ],
        },
        {
          questionNumber: 9,
          passageText: "Why Teenagers Struggle to Wake Up",
          prompt: "What is the writer's main purpose in the passage?",
          type: "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: "B",
          explanation: "To objectively explain the evidence and implications of later start times.",
          options: [
            { optionLabel: "A", content: "to criticize traditional education policies", isCorrect: false },
            { optionLabel: "B", content: "to explain the evidence for later school start times", isCorrect: true },
            { optionLabel: "C", content: "to advise parents on managing teenage bedtime routines", isCorrect: false },
            { optionLabel: "D", content: "to compare sleep patterns across different age groups", isCorrect: false },
          ],
        },
        {
          questionNumber: 10,
          passageText: "Why Teenagers Struggle to Wake Up - Paragraph B",
          prompt: "In the trial, fewer pupils arrived ______ to first lessons. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "late",
          explanation: "Paragraph B: Falling rates of chronic lateness mean fewer arrived late.",
          options: [],
        },
        {
          questionNumber: 11,
          passageText: "Why Teenagers Struggle to Wake Up - Paragraph D",
          prompt: "Sleep helps the brain with memory ______. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "consolidation",
          explanation: "Paragraph D: 'memory consolidation'.",
          options: [],
        },
        {
          questionNumber: 12,
          passageText: "Why Teenagers Struggle to Wake Up - Paragraph C",
          prompt: "Some districts solved transport problems by staggering start times between older pupils and ______ ones. (ONE WORD ONLY)",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "younger",
          explanation: "Paragraph C: 'older students and younger pupils'.",
          options: [],
        },
      ];

      const listeningPassage = `SECTION 1: RIVERSIDE SPORTS CLUB MEMBERSHIP FORM
Audio Track: IELTS Mini Practice Test - Section 1 Form Completion
Scenario: Arthur Baxter inquires about club membership and books an induction session with Maria.
Listen to the conversation and complete Questions 1-8. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.

Membership Form Details:
First name: Arthur
Surname: [Question 13]
Address: 42 [Question 14] Road, Highbury
Postcode: KL9 [Question 15]
Contact phone: 07700 900 [Question 16]
Type of membership: [Question 17]
Cost per month: £ [Question 18]
Health note: Injury to his [Question 19]
Induction session: Saturday at [Question 20] with Maria`;

      const listeningQuestions = [
        {
          questionNumber: 13,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Surname: _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Baxter",
          explanation: "Arthur Baxter (spelled B-A-X-T-E-R).",
          options: [],
        },
        {
          questionNumber: 14,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Address: 42 _______ Road, Highbury",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Elm",
          explanation: "42 Elm Road.",
          options: [],
        },
        {
          questionNumber: 15,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Postcode: KL9 _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "4PT",
          explanation: "KL9 4PT.",
          options: [],
        },
        {
          questionNumber: 16,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Contact telephone: 07700 900 _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "238119",
          explanation: "Phone number suffix is 238119.",
          options: [],
        },
        {
          questionNumber: 17,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Type of membership required: _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "Gold",
          explanation: "Gold membership tier.",
          options: [],
        },
        {
          questionNumber: 18,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Cost of membership per month: £ _______",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "45",
          explanation: "Monthly fee £45.",
          options: [],
        },
        {
          questionNumber: 19,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Health & fitness note: Suffered from an injury to his _______ last year",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "back",
          explanation: "Injury to his back.",
          options: [],
        },
        {
          questionNumber: 20,
          passageText: "Riverside Sports Club - Membership Application Form",
          prompt: "Induction session booked for: Saturday at _______ with Maria",
          type: "FILL_IN_BLANK",
          points: 1.0,
          correctAnswer: "10.30 a.m.",
          explanation: "Saturday at 10.30 a.m. with Maria.",
          options: [],
        },
      ];

      const writingPassage = `WRITING TASK 2: ACADEMIC ESSAY
You should spend about 40 minutes on this task. Write about the following topic:

Some people think that governments should spend money on improving public transport rather than building new roads.
To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.
Write at least 250 words.`;

      const writingQuestions = [
        {
          questionNumber: 21,
          passageText: "IELTS WRITING TASK 2",
          prompt: "Viết bài luận hoàn chỉnh tối thiểu 250 từ cho chủ đề trên (Writing Task 2).",
          type: "ESSAY",
          points: 9.0,
          correctAnswer: "Essay",
          explanation: "Chấm điểm trực tiếp bởi giáo viên theo 4 tiêu chí IELTS Writing: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.",
          options: [],
        },
      ];

      parsedQuestions = [
        ...readingQuestionsP1,
        ...readingQuestionsP2,
        ...listeningQuestions,
        ...writingQuestions,
      ];

      return {
        title,
        skill: "ALL_SKILLS",
        durationMinutes: durationMinutes || 120,
        audioUrl: audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        passageText: readingPassage1Text,
        questions: parsedQuestions,
        sections: [
          {
            id: "reading_1",
            key: "READING_1",
            skill: "READING",
            title: `${title} - Reading Passage 1: Urban Beekeeping`,
            durationMinutes: 30,
            passageText: readingPassage1Text,
            questions: readingQuestionsP1,
          },
          {
            id: "reading_2",
            key: "READING_2",
            skill: "READING",
            title: `${title} - Reading Passage 2: Why Teenagers Struggle to Wake Up`,
            durationMinutes: 30,
            passageText: readingPassage2Text,
            questions: readingQuestionsP2,
          },
          {
            id: "listening_1",
            key: "LISTENING_1",
            skill: "LISTENING",
            title: `${title} - Listening Section 1: Riverside Sports Club`,
            durationMinutes: 30,
            audioUrl: audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            passageText: listeningPassage,
            questions: listeningQuestions,
          },
          {
            id: "writing_1",
            key: "WRITING_1",
            skill: "WRITING",
            title: `${title} - Writing Task 2: Academic Essay`,
            durationMinutes: 40,
            passageText: writingPassage,
            questions: writingQuestions,
          },
        ],
      };
    } else {
      parsedQuestions = [
        {
          questionNumber: 1,
          prompt: "Ghi âm câu trả lời Speaking Part 2 trong vòng 2 phút dựa trên gợi ý từ Cue Card.",
          type: "SPEAKING_RECORD",
          points: 9.0,
          correctAnswer: "",
          explanation: "Giáo viên chấm điểm dựa trên Fluency, Pronunciation, Lexical Resource và Grammar.",
          options: [],
        },
      ];
    }
  }

  return {
    title,
    skill,
    durationMinutes,
    audioUrl,
    passageText,
    questions: parsedQuestions,
  };
}
