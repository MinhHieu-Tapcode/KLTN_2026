import { MatchingHeadingsGroup, FlowchartGroup, TableCompletionGroup } from "@/lib/exam-parser/types";

export const SHOWCASE_PASSAGE_SAMPLE = `Part 1 - Reading Passage 1
THE IMPACT OF TECHNOLOGY ON EDUCATION

A. Technology has transformed the way students learn and access information. With the rise of online platforms, learners can now study at their own pace and from anywhere in the world.

B. However, this shift also brings challenges. Many students struggle with self-discipline and find it difficult to stay motivated without direct supervision.

C. On the other hand, technology also provides teachers with new tools to create more engaging and personalized learning experiences.`;

export const SHOWCASE_FLOWCHART_SAMPLE: FlowchartGroup = {
  id: "fc-envisioning",
  title: "The Envisioning Process",
  instruction: "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
  boxes: [
    { id: "b1", textTemplate: "manager (having just obtained _______)", questionNumbers: [18], isStatic: false },
    { id: "b2", textTemplate: "people with greatly varied _______", questionNumbers: [19], isStatic: false },
    { id: "b3", textTemplate: "playing with language for a long time", isStatic: true },
    { id: "b4", textTemplate: "_______ set of words", questionNumbers: [20], isStatic: false },
    { id: "b5", textTemplate: "- obeyed only at _______\n- can cause lack of _______", questionNumbers: [21, 22], isStatic: false },
    { id: "b6", textTemplate: "want _______ payback", questionNumbers: [23], isStatic: false },
  ],
  questionNumbers: [18, 19, 20, 21, 22, 23],
};

export const SHOWCASE_HEADINGS_SAMPLE: MatchingHeadingsGroup = {
  id: "mh-showcase",
  title: "1.2 Matching Headings",
  instruction: "Choose the correct heading for each paragraph from the list of headings below.",
  headings: [
    { id: "h1", romanNumeral: "i", text: "The benefits of online learning" },
    { id: "h2", romanNumeral: "ii", text: "Challenges for students" },
    { id: "h3", romanNumeral: "iii", text: "The role of teachers" },
    { id: "h4", romanNumeral: "iv", text: "Technology and the future" },
  ],
  items: [
    { paragraphLabel: "Paragraph A", questionNumber: 1 },
    { paragraphLabel: "Paragraph B", questionNumber: 2 },
    { paragraphLabel: "Paragraph C", questionNumber: 3 },
  ],
  questionNumbers: [1, 2, 3],
};

export const SHOWCASE_TABLE_SAMPLE: TableCompletionGroup = {
  id: "tbl-showcase",
  title: "1.3 Table Completion",
  instruction: "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.",
  headers: ["Nº", "FEATURE", "DESCRIPTION"],
  rows: [
    ["1", "Location", { text: "Central campus near library", questionNumber: 1 }],
    ["2", "Facilities", { text: "High-speed computers", questionNumber: 2 }],
    ["3", "Opening hours", { text: "From 8 a.m. to 9 p.m.", questionNumber: 3 }],
  ],
  questionNumbers: [1, 2, 3],
};
