import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import newRequest from '../../utils/newRequest';
import './feedback.css';

const FeedbackStudent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get studentId from localStorage
  const { data: userData } = JSON.parse(localStorage.getItem("currentUser"));
  const { userId: studentId } = userData.user;

  // Get course info from navigation state
  const { courseId, courseName, credits } = location.state || {};

  // State for fetched course/faculty/session info
  const [courseDetails, setCourseDetails] = useState(null);
  const [facultyName, setFacultyName] = useState('');
  const [session, setSession] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Feedback form state
  const [feedbackData, setFeedbackData] = useState({
    ratings: {},
    comments: ''
  });
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch course, faculty, and session info on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // 1. Get course details
        const courseRes = await newRequest.get(`feedback/course/${courseId}/details`);
        const course = courseRes.data;
        setCourseDetails(course);

        console.log(course);



        // 2. Get faculty assignment (FacultyCourse) for this course
        const facultyCourseRes = await newRequest.get(`/feedback/course/${courseId}/faculty`);
        const facultyCourse = facultyCourseRes.data;

        // console.log("jdfhkjfhdkjfhkdjf");
        // console.log(facultyCourse);


        setSession(facultyCourse.session);
        setYear(facultyCourse.year);
        setFacultyName(facultyCourse.facultyId);

        setLoading(false);
      } catch (err) {
        setFetchError('Failed to fetch course or faculty information.');
        setLoading(false);
      }
    };

    if (courseId) fetchDetails();
    else setLoading(false);
  }, [courseId]);

  // Feedback questions
  const feedbackSections = [
    {
      id: 'course_content_section',
      title: 'Course Content',
      questions: [
        { id: 'course_content', text: 'Relevance of course content to your program' },
        { id: 'course_materials', text: 'Quality and accessibility of course materials' },
        { id: 'course_organization', text: 'Organization and structure of the course' }
      ]
    },
    {
      id: 'faculty_evaluation_section',
      title: 'Faculty Evaluation',
      questions: [
        { id: 'teaching_quality', text: 'Clarity of instruction and explanations' },
        { id: 'faculty_knowledge', text: "Faculty's knowledge of the subject matter" },
        { id: 'faculty_availability', text: "Faculty's availability and responsiveness" }
      ]
    },
    {
      id: 'assessment_section',
      title: 'Assessment',
      questions: [
        { id: 'assessment_fairness', text: 'Fairness of assessments and grading' },
        { id: 'feedback_quality', text: 'Quality and timeliness of feedback on assignments' }
      ]
    }
  ];

  const handleRatingChange = (questionId, value) => {
    setFeedbackData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [questionId]: value }
    }));
  };

  const handleCommentsChange = (e) => {
    setFeedbackData(prev => ({
      ...prev,
      comments: e.target.value
    }));
  };

  const validateForm = () => {
    const allQuestions = feedbackSections.flatMap(section => section.questions.map(q => q.id));
    const unanswered = allQuestions.filter(id => !feedbackData.ratings[id]);
    if (unanswered.length > 0) {
      setValidationError('Please answer all questions before submitting.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    // Format ratings for schema
    const formattedRatings = Object.entries(feedbackData.ratings).map(([questionId, rating]) => ({
      questionId,
      rating
    }));

    try {
      await newRequest.post('/feedback/submit', {
        student: studentId,
        faculty: courseDetails ? courseDetails.facultyId : '',
        course: courseId,
        isActive: true,
        ratings: formattedRatings,
        comments: feedbackData.comments || ''
      });
      navigate('/courses');
    } catch (err) {
      setError('Failed to submit feedback. Please try again later.');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/courses');
  };

  // UI
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        <span className="ml-4 text-gray-600 text-lg">Loading course information...</span>
      </div>
    );
  }

  if (fetchError || !courseDetails) {
    return (
      <div className="feedback-container">
        <div className="error-message">
          {fetchError || "Missing required information to submit feedback."}
          <div className="form-actions">
            <button type="button" className="back-btn" onClick={handleCancel}>
              Back to Feedback List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-8 mb-8">
      <h1 className="text-3xl font-bold mb-6 text-pink-700">Course Feedback Form</h1>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-pink-50 rounded-lg p-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{courseDetails.courseName}</h2>
          <p className="text-gray-600">Course Code: <span className="font-medium">{courseDetails.courseCode}</span></p>
          <p className="text-gray-600">Department: <span className="font-medium">{courseDetails.department}</span></p>
          <p className="text-gray-600">Credits: <span className="font-medium">{credits}</span></p>
        </div>
        <div className="mt-4 md:mt-0">
          <p className="text-gray-700 font-medium">Faculty: <span className="font-semibold">{facultyName}</span></p>
          <p className="text-gray-600">Session: <span className="font-medium">{session} {year}</span></p>
        </div>
      </div>
      {validationError && <div className="error-message mb-4">{validationError}</div>}
      {error && <div className="error-message mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-8">
        {feedbackSections.map(section => (
          <div key={section.id} className="feedback-section">
            <h3 className="section-title text-lg font-semibold text-pink-600 mb-2">{section.title}</h3>
            {section.questions.map(question => (
              <div key={question.id} className="question-item mb-4">
                <p className="question-text text-gray-800 mb-2">{question.text}</p>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <label key={rating} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={rating}
                        checked={feedbackData.ratings[question.id] === rating}
                        onChange={() => handleRatingChange(question.id, rating)}
                        className="accent-pink-500"
                      />
                      <span className="rating-circle bg-pink-100 text-pink-700 rounded-full px-2 py-1 text-xs font-medium">{rating}</span>
                      <span className="text-xs text-gray-500">
                        {rating === 1 ? 'Poor' :
                         rating === 2 ? 'Fair' :
                         rating === 3 ? 'Good' :
                         rating === 4 ? 'Very Good' : 'Excellent'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="comments-section">
          <h3 className="section-title text-lg font-semibold text-pink-600 mb-2">Additional Comments</h3>
          <textarea
            className="comments-input w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
            rows={5}
            placeholder="Please provide any additional feedback or suggestions for improvement..."
            value={feedbackData.comments}
            onChange={handleCommentsChange}
          />
        </div>
        <div className="form-actions flex justify-end gap-4">
          <button type="button" className="cancel-btn bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn bg-pink-600 text-white px-6 py-2 rounded hover:bg-pink-700" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackStudent;
