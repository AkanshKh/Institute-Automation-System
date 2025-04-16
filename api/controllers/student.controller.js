import { Student } from '../models/student.model.js';
import { Course, StudentCourse, FacultyCourse } from '../models/course.model.js';
import { ApplicationDocument, Bonafide, Passport } from '../models/documents.models.js';
import { Faculty } from '../models/faculty.model.js';
import { CourseDropRequest } from '../models/courseDropRequest.model.js';
import { User } from '../models/user.model.js';
import { Feedback , GlobalFeedbackConfig } from '../models/feedback.model.js';
// Get basic student info
export const getStudent = async (req, res) => {
    try {
        const studentId = req.params.id;
        // console.log(studentId);
        console.log(studentId);
        const user = await Student.findOne({ userId: studentId })
            .populate('userId');

        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json(user);
        console.log("Student details fetched successfully", user);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Error fetching student details' });
    }
};

//get completed courses for display on the completed courses page
// export const getCompletedCourses = async (req, res) => {
//     try {
//       console.log("Fetching completed courses for student ID:", req.params.id);
//       const user = await Student.findOne({ userId: req.params.id })
//         .populate('userId');
          
//       if (!user) {
//         return res.status(404).json({ message: 'Student not found' });
//       }
      
//       console.log("User: ", user);
//       const courses = await StudentCourse.find({
//         rollNo: user.rollNo,
//         isCompleted: true
//       })
//       .populate({
//         path: 'courseId',
//         model: 'Course',
//         select: 'courseCode courseName credits department'
//       })
//       .lean();
          
//       console.log("Completed courses fetched:", courses);
      
//       const formatted = courses.map(course => ({
//         courseCode: course.courseId.courseCode,
//         courseName: course.courseId.courseName,
//         credits: course.courseId.credits,
//         department: course.courseId.department,
//         semester: course.semester,
//         grade: course.grade,
//         creditOrAudit: course.creditOrAudit,
//         completedAt: course.updatedAt
//       }));
      
//       res.status(200).json({ courses: formatted });
//     } catch (error) {
//       console.error("Error fetching completed courses:", error);
//       res.status(500).json({ message: error.message });
//     }
//   };
  
export const getCompletedCourses = async (req, res) => {
    try {
      console.log("Fetching completed courses for student ID:", req.params.id);
      const user = await Student.findOne({ userId: req.params.id })
        .populate('userId');
          
      if (!user) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log("User: ", user);
      
      // First, get all completed student courses
      const studentCourses = await StudentCourse.find({
        rollNo: user.rollNo,
        isCompleted: true
      }).lean();
      
      // Get the courseIds to fetch course details
      const courseIds = studentCourses.map(sc => sc.courseId);
      
      // Fetch all relevant courses
      const courseDetails = await Course.find({
        courseCode: { $in: courseIds }
      }).lean();
      
      // Create a map for quick lookup
      const courseMap = {};
      courseDetails.forEach(course => {
        courseMap[course.courseCode] = course;
      });
      
      // Now combine the data
      const formatted = studentCourses.map(sc => {
        const course = courseMap[sc.courseId] || {};
        return {
          courseCode: course.courseCode || sc.courseId,
          courseName: course.courseName || 'Unknown Course',
          credits: course.credits || 0,
          department: course.department || 'Unknown',
          semester: sc.semester,
          grade: sc.grade,
          creditOrAudit: sc.creditOrAudit,
          completedAt: sc.updatedAt
        };
      });
      
      console.log("Formatted courses:", formatted);
      res.status(200).json({ courses: formatted });
    } catch (error) {
      console.error("Error fetching completed courses:", error);
      res.status(500).json({ message: error.message });
    }
  };
  
// Add this new function for student courses
export const getStudentCourses = async (req, res) => {
    try {
        const studentId = req.params.id;
        console.log("Fetching courses for student ID:", studentId);
        
        // First get the student record to get the roll number
        const student = await Student.findOne({ userId: studentId });

         if (!student) {
            console.log("Student not found for ID:", studentId);
            return res.status(404).json({ message: "Student not found" });
        }
        
        console.log("Found student with roll number:", student.rollNo);

        // Get current academic session
        const now = new Date();
        const year = now.getFullYear();
        let session;
        
        if (now.getMonth() >= 0 && now.getMonth() <= 4) {
            session = 'Spring Semester';
        } else if (now.getMonth() >= 5 && now.getMonth() <= 7) {
            session = 'Summer Course';
        } else {
            session = 'Winter Semester';
        }
        
        const semester = `${session} ${year}`;
        // console.log("Current academic session:", semester);
        // console.log(student.rollNo);
        
        // Find approved courses for this student
        const studentCourses = await StudentCourse.find({rollNo: student.rollNo, status: 'Approved'})
        // console.log(`Found ${studentCourses.length} enrolled courses for student`);
        
        if (!studentCourses || studentCourses.length === 0) {
            return res.status(200).json({ 
                courses: [],
                feedbackOpen: false
            });
        }

        // // Get global feedback status
        // const globalConfig = await GlobalFeedbackConfig.getConfig();
        // const globalFeedbackActive = globalConfig.isActive;

        // console.log(`Courses enrolled by student:`, studentCourses);
        
        // Get course details and faculty information
        const courses = await Promise.all(
            studentCourses.map(async (sc) => {
                const course = await Course.findOne({ courseCode: sc.courseId });
                console.log("Course details fetched:", course);
                if (!course) {
                    console.log(`Course not found for ID: ${sc.courseId}`);
                    return null;
                }
                
                const facultyCourse = await FacultyCourse.findOne({
                    courseCode: sc.courseId
                });
                console.log("Faculty course details fetched:", facultyCourse);
                // .populate('facultyId', 'name');
                
                // Use placeholder values for some fields
                return {
                    id: course.courseCode,
                    name: course.courseName,
                    // instructor: facultyCourse?.facultyId?.name || 'TBA',
                    credits: course.credits,
                    assignments: 8, // Placeholder
                    announcements: course.announcements.length,
                    attendance: 85 // Placeholder
                };
            })
        );
        console.log("Hehehhe", courses);
        // console.log(`Fetched course details for ${courses.length} courses`);
        // console.log(courses);
        // Filter out null values (courses that weren't found)
        const validCourses = courses.filter(course => course !== null);
        console.log(`Returning ${validCourses.length} valid courses`);
        

        // Check if feedback already submitted for this student, course, and faculty
        // const feedbackExists = await Feedback.findOne({
        //     student: student._id,
        //     course: course._id,
        //     faculty: facultyCourse.facultyId
        // });

        // Determine if feedback is available (implement your logic)
        const isFeedbackAvailable = globalFeedbackActive && !feedbackExists;
        
        res.status(200).json({
            courses: validCourses,
            feedbackOpen: isFeedbackAvailable
        });
        
    } catch (error) {
        console.error("Error fetching student courses:", error);
        res.status(500).json({ message: "Failed to fetch courses" });
    }
};

export const getCourseAnnouncements = async (req, res) => {
    try {
        
        const { courseId } = req.params;
      
      // Find course with announcements
      const course = await Course.findOne({ courseCode: courseId });
      
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      
      // If no announcements or empty array, return course with empty announcements
      if (!course.announcements || course.announcements.length === 0) {
        return res.status(200).json(course);
      }
      
      // Get all faculty IDs from announcements
      const facultyIds = [...new Set(course.announcements.map(announcement => announcement.postedBy))];
      
      // Find all faculty members who posted announcements
      const facultyMembers = await Faculty.find({ facultyId: { $in: facultyIds } });
      
      // Create a lookup object for faculty
      const facultyLookup = {};
      facultyMembers.forEach(faculty => {
        facultyLookup[faculty.facultyId] = {
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
          designation: faculty.designation
        };
      });
      
      // Add faculty details to each announcement
      const announcementsWithFaculty = course.announcements.map(announcement => {
        const faculty = facultyLookup[announcement.postedBy] || null;
        
        return {
          ...announcement.toObject(),
          faculty: faculty
        };
      });
      
      // Sort announcements by date (most recent first)
      announcementsWithFaculty.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Return course with enhanced announcements
      const result = {
        ...course.toObject(),
        announcements: announcementsWithFaculty
      };
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching course announcements:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch course announcements',
        error: error.message 
      });
    }
  };
  
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
  
  
// Drop a course for a student
export const dropCourse = async (req, res, next) => {
    try {
      const { studentId, courseId } = req.params;
      
      // Find the student
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Check if the student is enrolled in the course
      const courseIndex = student.courses.findIndex(course => course.toString() === courseId);
      if (courseIndex === -1) {
        return res.status(404).json({ message: "Course not found in student's enrolled courses" });
      }
      
      // Remove the course from the student's courses array
      student.courses.splice(courseIndex, 1);
      await student.save();
      
      // Find the course and update its enrolled students
      const course = await Course.findById(courseId);
      if (course) {
        const studentIndex = course.enrolledStudents.findIndex(id => id.toString() === studentId);
        if (studentIndex !== -1) {
          course.enrolledStudents.splice(studentIndex, 1);
          await course.save();
        }
      }
      
      res.status(200).json({ message: "Course dropped successfully" });
    } catch (error) {
      next(error);
    }
  };


  export const createCourseDropRequest = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { courseId } = req.body;
        
        // Find the student to get the roll number
        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Check if the student is enrolled in the course
        const studentCourse = await StudentCourse.findOne({ 
            rollNo: student.rollNo, 
            courseId: courseId,
            status: 'Approved'
        });
        
        if (!studentCourse) {
            return res.status(404).json({ message: 'Student is not enrolled in this course' });
        }
        
        // Check if there's already a pending drop request for this course
        const existingRequest = await CourseDropRequest.findOne({
            rollNo: student.rollNo,
            courseId: courseId,
            status: 'Pending'
        });
        
        if (existingRequest) {
            return res.status(400).json({ message: 'A drop request for this course is already pending' });
        }
        
        // Get course details
        const course = await Course.findOne({ courseCode: courseId });
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        // Get current academic session
        const now = new Date();
        const year = now.getFullYear();
        let session;
        
        if (now.getMonth() >= 0 && now.getMonth() <= 4) {
            session = 'Spring Semester';
        } else if (now.getMonth() >= 5 && now.getMonth() <= 7) {
            session = 'Summer Course';
        } else {
            session = 'Winter Semester';
        }
        
        const semester = `${session} ${year}`;
        
        // Create a new drop request
        const dropRequest = new CourseDropRequest({
            studentId: studentId,
            rollNo: student.rollNo,
            courseId: courseId,
            courseName: course.courseName,
            semester: semester,
            status: 'Pending'
        });
        
        await dropRequest.save();
        
        res.status(201).json({ 
            message: 'Course drop request submitted successfully',
            requestId: dropRequest._id
        });
        
    } catch (error) {
        console.error('Error creating course drop request:', error);
        res.status(500).json({ message: 'Failed to submit course drop request' });
    }
};

// Get all course drop requests for a student
export const getStudentDropRequests = async (req, res) => {
    try {
        const studentId = req.params.id;
        
        // Find the student to get the roll number
        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Get all drop requests for this student
        const dropRequests = await CourseDropRequest.find({ 
            rollNo: student.rollNo 
        }).sort({ createdAt: -1 });
        
        res.status(200).json(dropRequests);
        
    } catch (error) {
        console.error('Error fetching course drop requests:', error);
        res.status(500).json({ message: 'Failed to fetch course drop requests' });
    }
};

// Cancel a pending course drop request
export const cancelDropRequest = async (req, res) => {
    try {
        const studentId = req.params.id;
        const requestId = req.params.requestId;
        
        // Find the student to get the roll number
        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Find the drop request
        const dropRequest = await CourseDropRequest.findById(requestId);
        
        if (!dropRequest) {
            return res.status(404).json({ message: 'Drop request not found' });
        }
        
        // Check if the request belongs to this student
        if (dropRequest.rollNo !== student.rollNo) {
            return res.status(403).json({ message: 'Unauthorized to cancel this request' });
        }
        
        // Check if the request is still pending
        if (dropRequest.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot cancel a request that is already ${dropRequest.status.toLowerCase()}` });
        }
        
        // Delete the request
        await CourseDropRequest.findByIdAndDelete(requestId);
        
        res.status(200).json({ message: 'Course drop request cancelled successfully' });
        
    } catch (error) {
        console.error('Error cancelling course drop request:', error);
        res.status(500).json({ message: 'Failed to cancel course drop request' });
    }
};


// Get student details for bonafide
export const getStudentBonafideDetails = async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const student = await Student.findOne({ userId: studentId })
            .populate('userId', 'name dateOfBirth'); 
            
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentDetails = {
            name: student.userId.name,
            rollNo: student.rollNo,
            fatherName: student.fatherName,
            dateOfBirth: student.userId.dateOfBirth,
            program: student.program,
            department: student.department,
            hostel: student.hostel,
            roomNo: student.roomNo,
            semester: student.semester,
            batch: student.batch,
            enrolledYear: student.batch
        };

        res.status(200).json(studentDetails);
    } catch (error) {
        console.error('Error fetching student bonafide details:', error);
        res.status(500).json({ message: 'Error fetching student details' });
    }
};

// Create new bonafide application
export const createBonafideApplication = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { currentSemester, certificateFor, otherReason } = req.body;

        // Find student
        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Create application document
        const applicationDoc = new ApplicationDocument({
            studentId: student._id,
            documentType: 'Bonafide',
            status: 'Pending' // This matches the enum in ApplicationDocument model
        });
        await applicationDoc.save();

        // Create bonafide document
        const bonafide = new Bonafide({
            applicationId: applicationDoc._id,
            currentSemester,
            purpose: certificateFor,
            otherReason: certificateFor === 'Other' ? otherReason : undefined
        });
        await bonafide.save();

        res.status(201).json({ 
            message: 'Bonafide application submitted successfully',
            applicationId: applicationDoc._id 
        });
    } catch (error) {
        console.error('Error creating bonafide application:', error);
        res.status(500).json({ message: error.message || 'Error submitting bonafide application' });
    }
};

// Get student's bonafide applications
export const getBonafideApplications = async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const applications = await ApplicationDocument.find({ 
            studentId: student._id,
            documentType: 'Bonafide'
        }).sort({ createdAt: -1 });

        const applicationDetails = await Promise.all(applications.map(async (app) => {
            const bonafide = await Bonafide.findOne({ applicationId: app._id });
            if (!bonafide) return null;
            
            return {
                applicationDate: app.createdAt,
                certificateFor: bonafide.purpose === 'Other' ? bonafide.otherReason : bonafide.purpose,
                currentSemester: bonafide.currentSemester,
                remarks: app.approvalDetails?.remarks || '',
                documentStatus: app.status === 'Pending' ? 'Documents Under Review' : 'Documents Verified',
                currentStatus: app.status // Status is already in proper case from model
            };
        }));

        const validApplications = applicationDetails.filter(app => app !== null);
        res.status(200).json(validApplications);
    } catch (error) {
        console.error('Error fetching bonafide applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

// Get student details for passport
export const getStudentPassportDetails = async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const student = await Student.findOne({ userId: studentId })
            .populate('userId', 'name dateOfBirth email'); 
            
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentDetails = {
            name: student.userId.name,
            rollNo: student.rollNo,
            department: student.department,
            programme: student.program,
            dateOfBirth: student.userId.dateOfBirth,
            email: student.userId.email,
            contactNumber: student.userId.contactNo || '',
            hostelName: student.hostel,
            roomNo: student.roomNo,
            fathersName: student.fatherName,
            mothersName: student.motherName
        };
        // console.log('fetched student info for passport',studentDetails)
        res.status(200).json(studentDetails);
    } catch (error) {
        console.error('Error fetching student passport details:', error);
        res.status(500).json({ message: error.message });
    }
};

// Submit passport application
export const submitPassportApplication = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { 
            applicationType, 
            placeOfBirth, 
            semester, 
            mode, 
            tatkalReason, 
            travelPlans,
            travelDetails,
            fromDate,
            toDate
        } = req.body;

        const student = await Student.findOne({ userId: studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Create application document with proper status case
        const applicationDoc = new ApplicationDocument({
            studentId: student._id,
            documentType: 'Passport',
            status: 'Pending' // This matches the enum in ApplicationDocument model
        });
        await applicationDoc.save();

        // Create passport document
        const passport = new Passport({
            applicationId: applicationDoc._id,
            applicationType,
            placeOfBirth,
            semester,
            mode,
            tatkalReason,
            travelPlans,
            travelDetails,
            fromDate: travelPlans === 'yes' ? fromDate : undefined,
            toDate: travelPlans === 'yes' ? toDate : undefined
        });
        await passport.save();

        res.status(201).json({ 
            message: 'Passport application submitted successfully',
            applicationId: applicationDoc._id 
        });
    } catch (error) {
        console.error('Error creating passport application:', error);
        res.status(500).json({ message: error.message || 'Error submitting passport application' });
    }
};

// Get passport applications history
export const getPassportApplications = async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findOne({ userId: studentId });
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const applications = await ApplicationDocument.find({
            studentId: student._id,
            documentType: 'Passport'
        })
        .sort({ createdAt: -1 })
        .lean();

        const passportApplications = await Promise.all(
            applications.map(async (app) => {
                const passportDoc = await Passport.findOne({ applicationId: app._id });
                return {
                    applicationDate: new Date(app.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    applicationType: passportDoc.applicationType,
                    mode: passportDoc.mode,
                    remarks: app.approvalDetails?.remarks || '',
                    otherDetails: passportDoc.mode === 'tatkal' ? `Tatkal Application - ${passportDoc.tatkalReason}` : 'Regular Application',
                    documentStatus: app.status === 'Pending' ? 'Documents Under Review' : 'Documents Verified',
                    currentStatus: app.status // Status is already in proper case from model
                };
            })
        );

        const validApplications = passportApplications.filter(app => app !== null);
        res.status(200).json(validApplications);
    } catch (error) {
        console.error('Error fetching passport applications:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update student profile
export const updateStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.id;
        const updateData = req.body;

        // Update user data
        if (updateData.userData) {
            await User.findByIdAndUpdate(
                updateData.userData.userId,
                {
                    name: updateData.userData.name,
                    email: updateData.userData.email,
                    contactNo: updateData.userData.contact
                }
            );
        }

        // Update student data
        const student = await Student.findOneAndUpdate(
            { userId: studentId },
            {
                hostel: updateData.hostel,
                roomNo: updateData.roomNo,
                department: updateData.branch,
                program: updateData.program,
                semester: updateData.semester,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('userId');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json(student);
    } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).json({ message: error.message });
    }
};
