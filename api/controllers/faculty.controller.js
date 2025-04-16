import { Course} from '../models/course.model.js';
import { Faculty } from '../models/faculty.model.js';
import { Student } from '../models/student.model.js';
import { StudentCourse } from '../models/course.model.js';
import { User } from '../models/user.model.js';
import { GlobalFeedbackConfig } from '../models/feedback.model.js';

  
  // Get faculty by IDs
export const getFacultyByIds = async (req, res) => {
  try {
    const facultyIds = req.query.ids.split(',');
    
    // Find faculty members by IDs
    const facultyMembers = await Faculty.find({ facultyId: { $in: facultyIds } });
    
    if (!facultyMembers || facultyMembers.length === 0) {
      return res.status(404).json({ success: false, message: 'No faculty members found' });
    }
    
    return res.status(200).json(facultyMembers);
  } catch (error) {
    console.error('Error fetching faculty members:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch faculty members',
      error: error.message 
    });
  }
};

export const getFacultyCourses = async (req, res) => {
try {

    console.log("Fetching faculty courses for user ID:", req.params.id);
    const { id } = req.params;

    // Check if the faculty exists
    const faculty = await Faculty.findOne({ userId: id });
    // console.log("Faculty found:", faculty);
    if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Get the faculty courses with details
    const facultyCourses = faculty.courses || [];
    // console.log("Faculty courses:", facultyCourses);
    // Get current semester status
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // // Determine current session based on month
    let currentSession;
    if (currentMonth >= 0 && currentMonth <= 4) {
        currentSession = 'Winter Semester';
    } else if (currentMonth >= 5 && currentMonth <= 7) {
        currentSession = 'Summer Course';
    } else {
        currentSession = 'Spring Semester';
    }
    
    // Get all active courses for the current session
    // const activeCourses = facultyCourses.filter(course => 
    //     course.year === currentYear && 
    //     course.session === currentSession && 
    //     course.status === 'Ongoing'
    // );

    const activeCourses = facultyCourses.filter(course => course.status === 'Ongoing');
    console.log("Active courses:", activeCourses);
    // console.log("Active courses:", activeCourses);
    
    // Get course details for each active course
    const coursesWithDetails = await Promise.all(
        activeCourses.map(async (course) => {
        const courseDetails = await Course.findOne({ courseCode: course.courseCode });
        
        if (!courseDetails) {
            return {
            id: course.courseCode,
            name: course.courseCode, // Fallback if details not found
            department: "",
            credits: 0,
            assignments: 0,
            attendance: 0,
            announcements: 0,
            };
        }
        
        // Get student count (dummy data for now)
        // const studentCount = Math.floor(Math.random() * 60) + 20; // Random between 20-80
        const studentCount = courseDetails.students ? courseDetails.students.length : 0;
        // Get assignment count
        const assignmentCount = Math.floor(Math.random() * 5) + 1; // Random between 1-5
        
        // Get average attendance (dummy data)
        const avgAttendance = Math.floor(Math.random() * 30) + 70; // Random between 70-100
        
        return {
            id: courseDetails.courseCode,
            name: courseDetails.courseName,
            department: courseDetails.department,
            credits: courseDetails.credits,
            students: studentCount,
            assignments: assignmentCount,
            avgAttendance: avgAttendance,
            announcements: courseDetails.announcements ? courseDetails.announcements.length : 0,
            year: course.year,
            session: course.session,
        };
        })
    );
    
    // Get feedback availability status (could be from settings or config)
    // const feedbackOpen = currentMonth >= 3 && currentMonth <= 5; // Open during April-June
    const globalConfig = await GlobalFeedbackConfig.getConfig();
    const feedbackOpen = globalConfig.isActive;
    
    return res.status(200).json({
        courses: coursesWithDetails,
        feedbackOpen: feedbackOpen
    });
    
    } catch (error) {
    console.error('Error fetching faculty courses:', error);
    return res.status(500).json({ message: 'Error fetching faculty courses', error: error.message });
    }
}


export const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log("Fetching students for course ID:", courseId);

    // Find the course
    const course = await Course.findOne({ courseCode: courseId });
    console.log("Course found:", course);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    // Find all student registrations for this course
    // const students = await StudentCourse.find({ 
    //   courseId: courseId 
    // });

    const students = course.students || [];

    console.log("Student registrations found:", students);
    if (!students || students.length === 0) {
      return res.status(200).json({
        success: true,
        course: {
          courseCode: course.courseCode,
          courseName: course.courseName,
          department: course.department,
          credits: course.credits
        },
        students: []
      });
    }

    // Get roll numbers for all registered students
    // Find student details
    const studentDetails = await Student.find({
      // rollNo: { $in: studentRollNumbers }
      userId : { $in: students }
    });
    console.log("Student details found:", studentDetails);
    // Get user IDs for all students to retrieve names and emails
    // const userIds = studentDetails.map(student => student.userId);
    
    // Find user information
    const userInfo = await User.find({
      _id: { $in: students }
    }, 'name email profilePicture');

    // Create a lookup map for user info
    const userLookup = {};
    userInfo.forEach(user => {
      userLookup[user._id.toString()] = {
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      };
    });

    console.log("User information found:", userInfo);

    // Create a lookup map for student details
    const studentLookup = {};
    studentDetails.forEach(student => {
      studentLookup[student.userId.toString()] = {
        userId: student.userId.toString(),
        rollNo: student.rollNo,
        department: student.department,
        semester: student.semester,
        batch: student.batch,
        program: student.program,
        status: student.status,
        hostel: student.hostel,
        roomNo: student.roomNo
      };
    });

    console.log("Student details lookup:", studentLookup);
    // Combine all data
    const studentsWithDetails = students.map(registration => {
      console.log("Processing registration:", registration);
      const studentInfo = studentLookup[registration] || {};
      console.log("Student info found:", studentInfo);  
      const user = userLookup[studentInfo.userId] || {};
      
      // Generate random attendance data for demonstration (in a real app, this would come from your database)
      const attendance = Math.floor(Math.random() * 30) + 70; // Random attendance between 70-100%
      
      return {
        rollNo: studentInfo.rollNo,
        name: user.name || 'Unknown',
        email: user.email || 'No email',
        profilePicture: user.profilePicture || null,
        department: studentInfo.department || 'Unknown',
        semester: studentInfo.semester || 0,
        batch: studentInfo.batch || 'Unknown',
        program: studentInfo.program || 'Unknown',
        status: studentInfo.status || 'active',
        hostel: studentInfo.hostel || 'Unknown',
        roomNo: studentInfo.roomNo || 'Unknown',
        registrationStatus: registration.creditOrAudit || 'Credit',
        grade: registration.grade || null,
        attendance: attendance
      };
    });

    // Return course info and student details
    return res.status(200).json({
      success: true,
      course: {
        courseCode: course.courseCode,
        courseName: course.courseName,
        department: course.department,
        credits: course.credits
      },
      students: studentsWithDetails
    });
    
  } catch (error) {
    console.error('Error fetching course students:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch course students',
      error: error.message 
    });
  }
};  