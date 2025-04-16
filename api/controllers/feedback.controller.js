import { Feedback , GlobalFeedbackConfig } from '../models/feedback.model.js';
import { Course, FacultyCourse } from '../models/course.model.js';
import { Faculty } from '../models/faculty.model.js';
import { Student } from '../models/student.model.js';

// Feedback section structure (corrected typo)
const feedback_section = [
    {
        id: 'course_content_section',
        questions: ['course_content', 'course_materials', 'course_organization']
    },
    {
        id: 'faculty_evaluation_section',
        questions: ['teaching_quality', 'faculty_knowledge', 'faculty_availability']
    },
    {
        id: 'assessment_section',
        questions: ['assessment_fairness', 'feedback_quality']
    }
];

const initializeStatistics = () => ({
    totalFeedbacks: 0,
    sections: feedback_section.map(section => ({
        id: section.id,
        questions: section.questions.reduce((acc, questionId) => ({
            ...acc,
            [questionId]: {
                average: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                totalResponses: 0
            }
        }), {})
    }))
});

export const getFeedback = async (req, res) => {
    try {
        const { facultyId,courseCode } = req.params;
        console.log("1coursecode", facultyId);
        // const facultyId = req.user.id; // Get from authenticated user
        // console.log("2facultyId", facultyId);
        // console.log(`Fetching feedback for course: ${courseCode}, facultyId: ${facultyId}`);

        // Validate course using correct field name
        const course = await Course.findOne({ courseCode });
        if (!course) return res.status(404).json({ error: 'Course not found' });
        // console.log("3courfdsfsdfdsvfvse", course);
        console.log("3")

        // Validate faculty using user reference
        const faculty = await Faculty.findOne({ userId: facultyId });
        if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

        // Fetch feedback with proper population
        const feedbacks = await Feedback.find({
            faculty: faculty,
            course: course,
            isActive: true
        });

        console.log("4feedbacks", feedbacks.length);

        // Calculate statistics
        const statistics = initializeStatistics();
        statistics.totalFeedbacks = feedbacks.length;

        feedbacks.forEach(feedback => {
            feedback.ratings.forEach(({ questionId, rating }) => {
                feedback_section.forEach(section => {
                    if (section.questions.includes(questionId)) {
                        const sectionStats = statistics.sections.find(s => s.id === section.id);
                        const questionStats = sectionStats.questions[questionId];
                        
                        questionStats.average += rating;
                        questionStats.distribution[rating]++;
                        questionStats.totalResponses++;
                    }
                });
            });
        });

        // Finalize averages
        statistics.sections.forEach(section => {
            Object.values(section.questions).forEach(question => {
                if (question.totalResponses > 0) {
                    question.average = parseFloat((question.average / question.totalResponses).toFixed(2));
                }
            });
        });

        // Format response
        const response = {
            feedback: feedbacks.map(f => ({
                student: f.student?.rollNo || 'Anonymous',
                ratings: f.ratings,
                comments: f.comments,
                createdAt: f.createdAt
            })),
            statistics: {
                ...statistics,
                course: course.courseName,
                faculty: faculty.facultyId,
                courseCode: course.courseCode,
                department: course.department
            }
        };

        res.json(response);

    } catch (err) {
        res.status(500).json({ 
            error: 'Failed to fetch feedback data',
            details: err.message 
        });
    }
};

export const checkFeedbackStatus = async (req, res) => {
    try {
        const { userId, courseCode, facultyId } = req.params;

        const course = await Course.findOne({ courseCode });
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const faculty = await Faculty.findOne({ userId: facultyId });
        if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

        const existingFeedback = await Feedback.findOne({
            student: userId,
            course: course.id,
            faculty: faculty.id
        });

        res.json({ 
            feedbackSubmitted: !!existingFeedback,
            lastSubmitted: existingFeedback?.updatedAt 
        });

    } catch (err) {
        res.status(500).json({ 
            error: 'Failed to check feedback status',
            details: err.message 
        });
    }
};

export const submitFeedback = async (req, res) => {
    try {
        const { student, faculty, course, ratings, comments } = req.body;

        // Validate course
        const courseDoc = await Course.findOne({ courseCode: course });
        // if (!courseDoc) return res.status(400).json({ error: 'Invalid course code' });

        // Validate faculty
        const facultyDoc = await Faculty.findOne({ userId: faculty });
        // if (!facultyDoc) return res.status(400).json({ error: 'Invalid faculty' });

        // Validate student
        const studentDoc = await Student.findOne({ userId: student });
        // if (!studentDoc) return res.status(400).json({ error: 'Invalid student' });

        // Create/update feedback
        const feedback = await Feedback.findOneAndUpdate(
            { 
                student: studentDoc.id,
                // faculty: facultyDoc.id,  
                course: courseDoc.id 
            },
            {
                ratings: ratings.map(r => ({
                    questionId: r.questionId,
                    rating: Math.min(Math.max(Number(r.rating), 1), 5)
                })),
                comments: comments?.trim(),
                isActive: true,
                updatedAt: new Date()
            },
            { 
                upsert: true,
                new: true,
                runValidators: true 
            }
        );

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedback: {
                id: feedback.id,
                updatedAt: feedback.updatedAt
            }
        });

    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Invalid feedback data',
                details: Object.values(err.errors).map(e => e.message)
            });
        }
        if (err.code === 11000) {
            return res.status(409).json({ 
                error: 'Feedback already exists for this course and faculty' 
            });
        }
        res.status(500).json({ 
            error: 'Failed to submit feedback',
            details: err.message 
        });
    }
};

export const getCourseFacultyDetails = async (req, res) => {
    try {
        const { courseCode } = req.params;

        const facultyCourse = await FacultyCourse.findOne({ courseCode })

        if (!facultyCourse) {
            return res.status(404).json({ error: 'No faculty assigned to this course' });
        }

        const course = await Course.findOne({ courseCode });
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({
            facultyId: facultyCourse.facultyId,
            session: facultyCourse.session,
            year: facultyCourse.year,
            department: course.department
        });

    } catch (err) {
        res.status(500).json({ 
            error: 'Failed to fetch faculty details',
            details: err.message 
        });
    }
};

export const getCourseDetails = async (req, res) => {
    try {
        const { courseCode } = req.params;
        
        const course = await Course.findOne({ courseCode });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({
            courseCode: course.courseCode,
            courseName: course.courseName,
            department: course.department,
            credits: course.credits
        });

    } catch (err) {
        res.status(500).json({ 
            error: 'Failed to fetch course details',
            details: err.message 
        });
    }
};


export const getGlobalstatus = async (req, res) => {
    console.log("qwertyu");
    try {
      console.log("yaha ");  
      const config = await GlobalFeedbackConfig.getConfig();
      res.status(200).json({ isActive: config.isActive });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch feedback status',
        error: error.message 
      });
    }
  };
  
  export const setGlobalstatus = async (req, res) => {
    try {
      const { active } = req.body;
      const config = await GlobalFeedbackConfig.getConfig();
      
      if (typeof active !== 'boolean') {
        return res.status(400).json({ 
          message: 'Invalid request: active must be a boolean' 
        });
      }
  
      config.isActive = active;
      await config.save();
      
      res.status(200).json({ 
        message: 'Feedback status updated',
        isActive: config.isActive 
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to update feedback status',
        error: error.message 
      });
    }
  };
  