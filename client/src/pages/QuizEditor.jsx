import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  fetchQuizById, 
  createQuiz, 
  updateQuiz 
} from '../services/quizService';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  Check, 
  AlertCircle, 
  Triangle, 
  Diamond, 
  Circle, 
  Square,
  HelpCircle,
  Clock,
  Award,
  Image as ImageIcon,
  X
} from 'lucide-react';

const DEFAULT_MULTIPLE_CHOICE_OPTIONS = [
  { option_text: '', is_correct: false, color_shape: 'red_triangle' },
  { option_text: '', is_correct: false, color_shape: 'blue_diamond' },
  { option_text: '', is_correct: false, color_shape: 'yellow_circle' },
  { option_text: '', is_correct: false, color_shape: 'green_square' }
];

const DEFAULT_TRUE_FALSE_OPTIONS = [
  { option_text: 'True', is_correct: true, color_shape: 'blue_diamond' },
  { option_text: 'False', is_correct: false, color_shape: 'red_triangle' }
];

const TIME_OPTIONS = [10, 20, 30, 60, 90, 120];
const POINT_OPTIONS = [
  { label: 'Standard', value: 1000 },
  { label: 'Double', value: 2000 },
  { label: 'No Points', value: 0 }
];

export default function QuizEditor() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [quizMeta, setQuizMeta] = useState({
    title: 'Untitled Quiz',
    description: '',
    cover_image: ''
  });

  const [questions, setQuestions] = useState([
    {
      question_text: '',
      question_type: 'multiple_choice',
      time_seconds: 20,
      points: 1000,
      options: JSON.parse(JSON.stringify(DEFAULT_MULTIPLE_CHOICE_OPTIONS))
    }
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Load existing quiz when editing
  useEffect(() => {
    if (!isEditMode) return;

    async function loadQuiz() {
      try {
        setLoading(true);
        const data = await fetchQuizById(id, token);
        setQuizMeta({
          title: data.title || '',
          description: data.description || '',
          cover_image: data.cover_image || ''
        });

        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      } catch (err) {
        setError(err.message || 'Failed to load quiz details.');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [id, isEditMode, token]);

  const currentQuestion = questions[activeQuestionIndex] || questions[0];

  // Helper: update active question field
  const updateCurrentQuestion = (field, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        [field]: value
      };
      return copy;
    });
  };

  // Switch question type (Multiple Choice vs True/False)
  const handleTypeChange = (newType) => {
    if (newType === currentQuestion.question_type) return;

    setQuestions(prev => {
      const copy = [...prev];
      const q = copy[activeQuestionIndex];
      let newOptions;

      if (newType === 'true_false') {
        newOptions = JSON.parse(JSON.stringify(DEFAULT_TRUE_FALSE_OPTIONS));
      } else {
        newOptions = JSON.parse(JSON.stringify(DEFAULT_MULTIPLE_CHOICE_OPTIONS));
      }

      copy[activeQuestionIndex] = {
        ...q,
        question_type: newType,
        options: newOptions
      };
      return copy;
    });
  };

  // Update specific option in active question
  const handleOptionTextChange = (optionIndex, text) => {
    setQuestions(prev => {
      const copy = [...prev];
      const q = copy[activeQuestionIndex];
      const opts = [...q.options];
      opts[optionIndex] = { ...opts[optionIndex], option_text: text };
      copy[activeQuestionIndex] = { ...q, options: opts };
      return copy;
    });
  };

  // Select the single correct answer for the active question
  const handleToggleCorrect = (optionIndex) => {
    setQuestions(prev => {
      const copy = [...prev];
      const q = copy[activeQuestionIndex];
      const opts = q.options.map((opt, idx) => ({
        ...opt,
        is_correct: idx === optionIndex
      }));

      copy[activeQuestionIndex] = { ...q, options: opts };
      return copy;
    });
  };

  // Add a new question
  const handleAddQuestion = (type = 'multiple_choice') => {
    const newQ = {
      question_text: '',
      question_type: type,
      time_seconds: 20,
      points: 1000,
      options: JSON.parse(
        JSON.stringify(
          type === 'true_false'
            ? DEFAULT_TRUE_FALSE_OPTIONS
            : DEFAULT_MULTIPLE_CHOICE_OPTIONS
        )
      )
    };

    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  // Duplicate active question
  const handleDuplicateQuestion = (idx, e) => {
    e.stopPropagation();
    const cloned = JSON.parse(JSON.stringify(questions[idx]));
    setQuestions(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, cloned);
      return copy;
    });
    setActiveQuestionIndex(idx + 1);
  };

  // Delete a question
  const handleDeleteQuestion = (idx, e) => {
    e.stopPropagation();
    if (questions.length <= 1) {
      setError('A quiz must have at least 1 question.');
      return;
    }

    setQuestions(prev => {
      const copy = prev.filter((_, i) => i !== idx);
      return copy;
    });

    if (activeQuestionIndex >= questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, questions.length - 2));
    }
  };

  // Move question Up or Down
  const handleMoveQuestion = (idx, direction, e) => {
    e.stopPropagation();
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    setQuestions(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });

    setActiveQuestionIndex(targetIdx);
  };

  // Validate entire quiz before saving
  const validateQuiz = () => {
    if (!quizMeta.title || !quizMeta.title.trim()) {
      return 'Please enter a title for the quiz.';
    }

    if (questions.length === 0) {
      return 'Please add at least one question.';
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.question_text.trim()) {
        setActiveQuestionIndex(i);
        return `Question #${i + 1} is missing question text.`;
      }

      if (!q.options || q.options.length < 2) {
        setActiveQuestionIndex(i);
        return `Question #${i + 1} must have at least 2 options.`;
      }

      const hasCorrect = q.options.some(opt => Boolean(opt.is_correct));
      if (!hasCorrect) {
        setActiveQuestionIndex(i);
        return `Question #${i + 1} must have a correct answer selected. Click the checkmark icon on the correct option.`;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].option_text || !q.options[j].option_text.trim()) {
          setActiveQuestionIndex(i);
          return `Question #${i + 1}, Answer #${j + 1} cannot be empty.`;
        }
      }
    }

    return null;
  };

  // Save Quiz handler
  const handleSaveQuiz = async () => {
    setError('');
    const validationError = validateQuiz();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: quizMeta.title.trim(),
        description: quizMeta.description.trim(),
        cover_image: quizMeta.cover_image.trim(),
        questions: questions.map((q, idx) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          time_seconds: q.time_seconds,
          points: q.points,
          order_index: idx + 1,
          options: q.options.map((opt, optIdx) => ({
            option_text: opt.option_text.trim(),
            is_correct: Boolean(opt.is_correct),
            color_shape: opt.color_shape,
            order_index: optIdx + 1
          }))
        }))
      };

      if (isEditMode) {
        await updateQuiz(id, payload, token);
      } else {
        await createQuiz(payload, token);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save quiz. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render Kahoot Shape Icon
  const renderShapeIcon = (colorShape) => {
    switch (colorShape) {
      case 'red_triangle':
        return <Triangle size={22} fill="currentColor" />;
      case 'blue_diamond':
        return <Diamond size={22} fill="currentColor" />;
      case 'yellow_circle':
        return <Circle size={22} fill="currentColor" />;
      case 'green_square':
        return <Square size={22} fill="currentColor" />;
      default:
        return <Triangle size={22} fill="currentColor" />;
    }
  };

  const getColorClass = (colorShape) => {
    switch (colorShape) {
      case 'red_triangle':
        return 'option-red';
      case 'blue_diamond':
        return 'option-blue';
      case 'yellow_circle':
        return 'option-yellow';
      case 'green_square':
        return 'option-green';
      default:
        return 'option-red';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '30px 50px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Loading Quiz Editor...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-editor-page">
      {/* Top Header Bar */}
      <header className="editor-topbar">
        <div className="editor-title-container">
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/dashboard')}
            title="Back to Teacher Dashboard"
            style={{ padding: '8px 12px' }}
          >
            <ArrowLeft size={18} />
          </button>
          
          <input
            type="text"
            className="editor-title-input"
            value={quizMeta.title}
            onChange={(e) => setQuizMeta({ ...quizMeta, title: e.target.value })}
            placeholder="Enter quiz title..."
          />

          <button 
            className="btn btn-secondary" 
            onClick={() => setIsSettingsModalOpen(true)}
            title="Quiz Settings (Description, Cover Image)"
            style={{ padding: '8px 12px' }}
          >
            <Settings size={18} /> Settings
          </button>
        </div>

        <div className="editor-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSaveQuiz}
            disabled={saving}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={18} /> {isEditMode ? 'Update Quiz' : 'Save Quiz'}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Error Alert Banner */}
      {error && (
        <div style={{ padding: '12px 24px', background: 'rgba(231, 76, 60, 0.2)', borderBottom: '1px solid rgba(231, 76, 60, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff7675', fontSize: '0.9rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError('')} 
            style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Studio Body: Sidebar Question Strip + Canvas */}
      <div className="editor-workspace">
        {/* Left Sidebar Question Strip */}
        <aside className="question-strip">
          <div className="question-strip-header">
            <h3>Questions ({questions.length})</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total: {questions.reduce((acc, q) => acc + (q.time_seconds || 20), 0)}s
            </span>
          </div>

          <div className="question-strip-list">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className={`question-thumbnail-card ${activeQuestionIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveQuestionIndex(idx)}
              >
                <div className="thumbnail-top">
                  <span className="thumbnail-number">{idx + 1}. {q.question_type === 'true_false' ? 'True/False' : 'Quiz'}</span>
                  <div className="thumbnail-actions">
                    <button
                      className="thumbnail-btn-mini"
                      disabled={idx === 0}
                      onClick={(e) => handleMoveQuestion(idx, -1, e)}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="thumbnail-btn-mini"
                      disabled={idx === questions.length - 1}
                      onClick={(e) => handleMoveQuestion(idx, 1, e)}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      className="thumbnail-btn-mini"
                      onClick={(e) => handleDuplicateQuestion(idx, e)}
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    {questions.length > 1 && (
                      <button
                        className="thumbnail-btn-mini danger"
                        onClick={(e) => handleDeleteQuestion(idx, e)}
                        title="Delete question"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="thumbnail-text">
                  {q.question_text ? q.question_text : 'Empty question...'}
                </div>

                <div className="thumbnail-meta">
                  <span>⏱ {q.time_seconds || 20}s</span>
                  <span>🏆 {q.points || 1000} pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="question-strip-footer">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8rem', padding: '8px 10px' }}
                onClick={() => handleAddQuestion('multiple_choice')}
              >
                <Plus size={15} /> 4-Choice
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8rem', padding: '8px 10px' }}
                onClick={() => handleAddQuestion('true_false')}
              >
                <Plus size={15} /> True/False
              </button>
            </div>
          </div>
        </aside>

        {/* Central Studio Canvas */}
        <main className="question-canvas">
          {/* Question Prompt Area */}
          <div className="question-prompt-card">
            <textarea
              className="question-prompt-input"
              rows={2}
              placeholder="Start typing your question here..."
              value={currentQuestion.question_text || ''}
              onChange={(e) => updateCurrentQuestion('question_text', e.target.value)}
            />
          </div>

          {/* Question Configuration Settings Bar */}
          <div className="question-settings-bar">
            {/* Question Type */}
            <div className="control-group">
              <span className="control-label">
                <HelpCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Type
              </span>
              <div className="pill-group">
                <button
                  type="button"
                  className={`pill-btn ${currentQuestion.question_type === 'multiple_choice' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('multiple_choice')}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  className={`pill-btn ${currentQuestion.question_type === 'true_false' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('true_false')}
                >
                  True / False
                </button>
              </div>
            </div>

            {/* Time Limit */}
            <div className="control-group">
              <span className="control-label">
                <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Time
              </span>
              <div className="pill-group">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`pill-btn ${currentQuestion.time_seconds === t ? 'active' : ''}`}
                    onClick={() => updateCurrentQuestion('time_seconds', t)}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {/* Points */}
            <div className="control-group">
              <span className="control-label">
                <Award size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Points
              </span>
              <div className="pill-group">
                {POINT_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`pill-btn ${currentQuestion.points === p.value ? 'active' : ''}`}
                    onClick={() => updateCurrentQuestion('points', p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kahoot 4-Color/Shape Options Grid */}
          <div className={`kahoot-options-grid ${currentQuestion.question_type === 'true_false' ? 'tf-mode' : ''}`}>
            {currentQuestion.options.map((opt, optIdx) => (
              <div 
                key={optIdx} 
                className={`kahoot-option-card ${getColorClass(opt.color_shape)}`}
              >
                <div className="shape-badge">
                  {renderShapeIcon(opt.color_shape)}
                </div>

                <div className="option-input-wrapper">
                  <input
                    type="text"
                    className="option-text-input"
                    placeholder={`Add answer ${optIdx + 1}${opt.is_correct ? ' (Correct)' : ''}`}
                    value={opt.option_text || ''}
                    disabled={currentQuestion.question_type === 'true_false'}
                    onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={`btn-correct-toggle ${opt.is_correct ? 'is-correct' : ''}`}
                  onClick={() => handleToggleCorrect(optIdx)}
                  title={opt.is_correct ? 'Marked as correct answer' : 'Click to mark as correct answer'}
                >
                  <Check size={22} strokeWidth={3.5} />
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Quiz Settings Modal */}
      {isSettingsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem' }}>Quiz Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label>Quiz Title</label>
              <input
                type="text"
                className="form-input"
                value={quizMeta.title}
                onChange={(e) => setQuizMeta({ ...quizMeta, title: e.target.value })}
                placeholder="e.g. Science Trivia & Astronomy"
              />
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                className="form-input"
                style={{ height: '80px', resize: 'vertical' }}
                value={quizMeta.description}
                onChange={(e) => setQuizMeta({ ...quizMeta, description: e.target.value })}
                placeholder="Brief summary of what this quiz covers..."
              />
            </div>

            <div className="form-group">
              <label>Cover Image URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                value={quizMeta.cover_image}
                onChange={(e) => setQuizMeta({ ...quizMeta, cover_image: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
              />
              {quizMeta.cover_image && (
                <div style={{ marginTop: '10px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                  <img 
                    src={quizMeta.cover_image} 
                    alt="Cover preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setIsSettingsModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
