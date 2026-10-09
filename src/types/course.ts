export interface Course {
  code: string;           // e.g. "CS301"
  name: string;           // e.g. "Artificial Intelligence & Expert Systems"
  department: string;     // e.g. "Computer Science & Engineering"
  semester: number;       // e.g. 5
  credits: number;        // e.g. 4
  assignedLecturerId: string;
  assignedLecturerName: string;
  lectureRoom: string;    // e.g. "LH-201"
  scheduleSummary: string;// e.g. "Mon, Wed, Fri: 10:00 - 11:00 AM"
  syllabusSummary: string;
}
