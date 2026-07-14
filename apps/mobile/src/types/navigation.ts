export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type QuestionForClient = {
  id: string;
  order: number;
  type: string;
  question_text: string;
  options: string[];
  explanation: string;
};

export type QuestionResult = {
  question_id: string;
  order: number;
  question_text: string;
  options: string[];
  child_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  help_note: string | null;
};

export type AppStackParamList = {
  Home: { parentName: string };
  AddChild: undefined;
  ChildDashboard: { childId: string; childName: string; childClass: string; avatar: string };
  SubjectDetail: { childId: string; childName: string; childClass: string; subject: string; subjectIcon: string; subjectColor: string };
  ChildHistory: { childId: string; childName: string };
  TestConfig: { childId: string; childName: string; childClass: string; subject: string };
  Test: { testId: string; subject: string; difficulty: string; childName: string; questions: QuestionForClient[] };
  Results: { testId: string; score: number; total: number; percentage: number; results: QuestionResult[] };
  // Nursery / early-learning exercises
  NurseryExercises: { childId: string; childName: string; childClass: string; avatar: string };
  LineTracing: { childName: string };
  AlphabetTracing: { childName: string };
  NumberTracing: { childName: string };
  Colours: { childName: string };
  ShapeTracing: { childName: string };
};
