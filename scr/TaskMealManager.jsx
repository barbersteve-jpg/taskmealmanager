import React, { useState, useEffect } from 'react';
import { Calendar, ChefHat, CheckSquare, Users, Plus, Bell, AlertTriangle, Info, Clock, Edit, Trash2 } from 'lucide-react';

const TaskMealManager = () => {
  const [currentView, setCurrentView] = useState('calendar');
  const [calendarView, setCalendarView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // API Configuration
  const API_BASE = 'https://wyedot.com/wp-json/task-meal/v1';
  
  // Data states - start with empty arrays
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [meals, setMeals] = useState([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const [taskForm, setTaskForm] = useState({ title: '', assignedTo: '', dueDate: '', type: 'chore' });
  const [recipeForm, setRecipeForm] = useState({ name: '', url: '', ingredients: '' });
  const [mealForm, setMealForm] = useState({ recipeId: '', date: '', mealType: 'breakfast', assignedTo: '' });
  const [userForm, setUserForm] = useState({ name: '', role: 'user', password: '', email: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // API Helper function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Load all data from WordPress
  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, tasksData, recipesData, mealsData] = await Promise.all([
        apiCall('/users'),
        apiCall('/tasks'),
        apiCall('/recipes'),
        apiCall('/meals')
      ]);
      
      setUsers(usersData);
      setTasks(tasksData);
      setRecipes(recipesData);
      setMeals(mealsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const getRecipeName = (recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : 'Unknown Recipe';
  };

  const getTaskNotifications = (userId = null) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const userTasks = userId ? tasks.filter(task => task.assignedTo === userId && !task.completed) : tasks.filter(task => !task.completed);

    const overdue = userTasks.filter(task => task.dueDate < today);
    const dueToday = userTasks.filter(task => task.dueDate === today);
    const dueTomorrow = userTasks.filter(task => task.dueDate === tomorrowStr);

    return { overdue, dueToday, dueTomorrow };
  };

  const getNotificationCount = (userId = null) => {
    const { overdue, dueToday, dueTomorrow } = getTaskNotifications(userId);
    return overdue.length + dueToday.length + dueTomorrow.length;
  };

  const handleLogin = async () => {
    setLoginError('');
    try {
      const response = await apiCall('/auth', {
        method: 'POST',
        body: JSON.stringify({ 
          email: loginForm.email, 
          password: loginForm.password 
        })
      });
      
      if (response.success) {
        setCurrentUserId(response.user.id);
        setIsAdmin(response.user.role === 'admin');
        setIsLoggedIn(true);
        setLoginForm({ email: '', password: '' });
        await loadData(); // Reload data after login
      }
    } catch (error) {
      setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserId(null);
    setIsAdmin(false);
    setCurrentView('calendar');
    setShowNotifications(false);
    setLoginForm({ email: '', password: '' });
  };

  const switchUserRole = () => {
    // For demo purposes - in production this would be handled differently
    if (isAdmin) {
      setIsAdmin(false);
      setCurrentUserId(users.find(u => u.role === 'user')?.id || null);
    } else {
      setIsAdmin(true);
      setCurrentUserId(users.find(u => u.role === 'admin')?.id || null);
    }
  };

  const toggleTaskComplete = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await apiCall(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: !task.completed })
      });
      
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ));
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const addTask = async () => {
    if (taskForm.title && taskForm.assignedTo && taskForm.dueDate) {
      try {
        const newTask = await apiCall('/tasks', {
          method: 'POST',
          body: JSON.stringify(taskForm)
        });
        
        setTasks([...tasks, newTask]);
        setTaskForm({ title: '', assignedTo: '', dueDate: '', type: 'chore' });
        setShowTaskModal(false);
      } catch (error) {
        console.error('Failed to add task:', error);
      }
    }
  };

  const addRecipe = async () => {
    if (recipeForm.name) {
      try {
        const recipeData = {
          ...recipeForm,
          ingredients: recipeForm.ingredients.split(',').map(i => i.trim()).filter(i => i)
        };
        
        const newRecipe = await apiCall('/recipes', {
          method: 'POST',
          body: JSON.stringify(recipeData)
        });
        
        setRecipes([...recipes, newRecipe]);
        setRecipeForm({ name: '', url: '', ingredients: '' });
        setShowRecipeModal(false);
      } catch (error) {
        console.error('Failed to add recipe:', error);
      }
    }
  };

  const addMeal = async () => {
    if (mealForm.recipeId && mealForm.date && mealForm.assignedTo) {
      try {
        const newMeal = await apiCall('/meals', {
          method: 'POST',
          body: JSON.stringify(mealForm)
        });
        
        setMeals([...meals, newMeal]);
        setMealForm({ recipeId: '', date: '', mealType: 'breakfast', assignedTo: '' });
        setShowMealModal(false);
      } catch (error) {
        console.error('Failed to add meal:', error);
      }
    }
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const openMealDetail = (meal) => {
    setSelectedMeal(meal);
    setShowMealDetailModal(true);
  };

  const closeDetailModals = () => {
    setShowTaskDetailModal(false);
    setShowMealDetailModal(false);
    setSelectedTask(null);
    setSelectedMeal(null);
  };

  // Calendar functions
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      dates.push(currentDate);
    }
    
    return { dates, currentMonth: month, currentYear: year };
  };

  const getItemsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTasks = tasks.filter(task => task.dueDate === dateStr);
    const dayMeals = meals.filter(meal => meal.date === dateStr);
    return { tasks: dayTasks, meals: dayMeals };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Task & Meal Manager...</p>
        </div>
      </div>
    );
  }

  // Show public view without login requirement
  const renderNotifications = () => {
    const notifications = getTaskNotifications(isAdmin ? null : currentUserId);
    const { overdue, dueToday, dueTomorrow } = notifications;

    return (
      <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Task Reminders</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {overdue.length > 0 && (
            <div className="p-4 border-b bg-red-50">
              <h4 className="font-medium text-red-800 flex items-center mb-2">
                <AlertTriangle size={16} className="mr-2" />
                Overdue ({overdue.length})
              </h4>
              {overdue.map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm mb-2">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-gray-600">Due: {formatDate(task.dueDate)}</div>
                    {isAdmin && <div className="text-gray-500">Assigned to: {getUserName(task.assignedTo)}</div>}
                  </div>
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <CheckSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {dueToday.length > 0 && (
            <div className="p-4 border-b bg-orange-50">
              <h4 className="font-medium text-orange-800 flex items-center mb-2">
                <Clock size={16} className="mr-2" />
                Due Today ({dueToday.length})
              </h4>
              {dueToday.map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm mb-2">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {isAdmin && <div className="text-gray-500">Assigned to: {getUserName(task.assignedTo)}</div>}
                  </div>
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <CheckSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {dueTomorrow.length > 0 && (
            <div className="p-4 border-b bg-blue-50">
              <h4 className="font-medium text-blue-800 flex items-center mb-2">
                <Info size={16} className="mr-2" />
                Due Tomorrow ({dueTomorrow.length})
              </h4>
              {dueTomorrow.map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm mb-2">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {isAdmin && <div className="text-gray-500">Assigned to: {getUserName(task.assignedTo)}</div>}
                  </div>
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <CheckSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <CheckSquare size={24} className="mx-auto mb-2 text-green-500" />
              All caught up! No pending task reminders.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Task & Meal Manager</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
              >
                <Bell size={20} />
                {getNotificationCount(isAdmin ? null : currentUserId) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getNotificationCount(isAdmin ? null : currentUserId)}
                  </span>
                )}
              </button>
              {showNotifications && renderNotifications()}
            </div>
            
            <span className="text-sm text-gray-600">
              Public View - Data from wyedot.com
            </span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="px-6 py-3 flex space-x-6">
          <button
            onClick={() => setCurrentView('calendar')}
            className={`flex items-center px-3 py-2 rounded ${
              currentView === 'calendar' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calendar className="mr-2" size={18} />
            Calendar
          </button>
          <button
            onClick={() => setCurrentView('tasks')}
            className={`flex items-center px-3 py-2 rounded ${
              currentView === 'tasks' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <CheckSquare className="mr-2" size={18} />
            Tasks
          </button>
          <button
            onClick={() => setCurrentView('recipes')}
            className={`flex items-center px-3 py-2 rounded ${
              currentView === 'recipes' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ChefHat className="mr-2" size={18} />
            Recipes
          </button>
          <button
            onClick={() => setCurrentView('meals')}
            className={`flex items-center px-3 py-2 rounded ${
              currentView === 'meals' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Clock className="mr-2" size={18} />
            Meals
          </button>
        </div>
      </nav>

      <main onClick={() => setShowNotifications(false)}>
        {currentView === 'calendar' && (
          <div>
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1 rounded ${
                    calendarView === 'day' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1 rounded ${
                    calendarView === 'week' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1 rounded ${
                    calendarView === 'month' ? 'bg-orange-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Month
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1);
                    } else if (calendarView === 'week') {
                      newDate.setDate(newDate.getDate() - 7);
                    } else {
                      newDate.setDate(newDate.getDate() - 1);
                    }
                    setSelectedDate(newDate);
                  }}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ←
                </button>
                <span className="text-sm font-medium">
                  {calendarView === 'month' 
                    ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : selectedDate.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                  }
                </span>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1);
                    } else if (calendarView === 'week') {
                      newDate.setDate(newDate.getDate() + 7);
                    } else {
                      newDate.setDate(newDate.getDate() + 1);
                    }
                    setSelectedDate(newDate);
                  }}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  →
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Today
                </button>
              </div>
            </div>

            {calendarView === 'day' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">{formatDate(selectedDate)}</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <CheckSquare className="mr-2" size={20} />
                      Tasks & Chores
                    </h3>
                    {(() => {
                      const items = getItemsForDate(selectedDate);
                      return items.tasks.length === 0 ? (
                        <p className="text-gray-500">No tasks for this day</p>
                      ) : (
                        items.tasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded mb-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTaskComplete(task.id)}
                                className="mr-3"
                              />
                              <div>
                                <span className={task.completed ? 'line-through text-gray-500' : ''}>{task.title}</span>
                                <p className="text-sm text-gray-600">{getUserName(task.assignedTo)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <ChefHat className="mr-2" size={20} />
                      Meals
                    </h3>
                    {(() => {
                      const items = getItemsForDate(selectedDate);
                      return items.meals.length === 0 ? (
                        <p className="text-gray-500">No meals planned</p>
                      ) : (
                        items.meals.map(meal => (
                          <div key={meal.id} className="flex items-center justify-between p-2 bg-white rounded mb-2">
                            <div>
                              <span className="font-medium">{meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}</span>
                              <p className="text-sm">{getRecipeName(meal.recipeId)}</p>
                              <p className="text-sm text-gray-600">{getUserName(meal.assignedTo)}</p>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {calendarView === 'week' && (
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold p-2 bg-gray-100">
                      {day}
                    </div>
                  ))}
                  {getWeekDates(selectedDate).map(date => {
                    const items = getItemsForDate(date);
                    return (
                      <div key={date.toISOString()} className="border min-h-32 p-2">
                        <div className="text-sm font-semibold mb-2">{date.getDate()}</div>
                        {items.tasks.map(task => (
                          <div 
                            key={task.id} 
                            className="text-xs bg-orange-100 p-1 rounded mb-1 truncate cursor-pointer hover:bg-orange-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDetail(task);
                            }}
                          >
                            {task.title}
                          </div>
                        ))}
                        {items.meals.map(meal => (
                          <div 
                            key={meal.id} 
                            className="text-xs bg-green-100 p-1 rounded mb-1 truncate cursor-pointer hover:bg-green-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMealDetail(meal);
                            }}
                          >
                            {meal.mealType}: {getRecipeName(meal.recipeId)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {calendarView === 'month' && (
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">
                    {(() => {
                      const { currentMonth, currentYear } = getMonthDates(selectedDate);
                      return new Date(currentYear, currentMonth).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      });
                    })()}
                  </h2>
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold p-3 bg-gray-100 text-gray-700">
                      {day}
                    </div>
                  ))}
                  
                  {(() => {
                    const { dates, currentMonth } = getMonthDates(selectedDate);
                    const today = new Date().toDateString();
                    
                    return dates.map((date, index) => {
                      const items = getItemsForDate(date);
                      const isCurrentMonth = date.getMonth() === currentMonth;
                      const isToday = date.toDateString() === today;
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      
                      return (
                        <div 
                          key={index} 
                          className={`min-h-24 p-2 border cursor-pointer hover:bg-gray-50 ${
                            isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                          } ${isToday ? 'bg-orange-50 border-orange-300' : ''} ${
                            isSelected ? 'ring-2 ring-orange-500' : ''
                          }`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isToday ? 'text-orange-600 font-bold' : ''
                          }`}>
                            {date.getDate()}
                          </div>
                          
                          {items.tasks.slice(0, 2).map(task => (
                            <div 
                              key={task.id} 
                              className={`text-xs p-1 rounded mb-1 truncate cursor-pointer ${
                                task.completed 
                                  ? 'bg-gray-200 text-gray-500 line-through hover:bg-gray-300' 
                                  : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                              }`}
                              title={`${task.title} - ${getUserName(task.assignedTo)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskDetail(task);
                              }}
                            >
                              {task.title}
                            </div>
                          ))}
                          
                          {items.meals.slice(0, 1).map(meal => (
                            <div 
                              key={meal.id} 
                              className="text-xs bg-green-100 text-green-800 p-1 rounded mb-1 truncate cursor-pointer hover:bg-green-200"
                              title={`${meal.mealType}: ${getRecipeName(meal.recipeId)} - ${getUserName(meal.assignedTo)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openMealDetail(meal);
                              }}
                            >
                              🍽️ {meal.mealType}
                            </div>
                          ))}
                          
                          {(items.tasks.length > 2 || items.meals.length > 1) && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{(items.tasks.length > 2 ? items.tasks.length - 2 : 0) + 
                                (items.meals.length > 1 ? items.meals.length - 1 : 0)} more
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="mt-4 flex justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-100 rounded mr-2"></div>
                    <span>Tasks</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
                    <span>Meals</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-50 border border-orange-300 rounded mr-2"></div>
                    <span>Today</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'tasks' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Tasks & Chores</h2>
            </div>

            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTaskComplete(task.id)}
                      className="mr-4"
                    />
                    <div>
                      <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Assigned to: {getUserName(task.assignedTo)} | Due: {formatDate(task.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'recipes' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recipes</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="bg-white border rounded-lg shadow-sm p-4">
                  <h3 className="font-medium mb-2">{recipe.name}</h3>
                  <div className="text-sm text-gray-600">
                    <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
                  </div>
                  {recipe.url && (
                    <div className="text-sm text-blue-600 mt-2">
                      <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        View Recipe
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'meals' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Meal Planning</h2>
            </div>

            <div className="space-y-3">
              {meals.map(meal => (
                <div key={meal.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                  <div>
                    <h3 className="font-medium">
                      {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}: {getRecipeName(meal.recipeId)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(meal.date)} | Assigned to: {getUserName(meal.assignedTo)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showTaskDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Task Details</h3>
              <button
                onClick={closeDetailModals}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm text-gray-900">{selectedTask.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-sm text-gray-900">{getUserName(selectedTask.assignedTo)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <p className="text-sm text-gray-900">{formatDate(selectedTask.dueDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900 capitalize">{selectedTask.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`text-sm font-medium ${selectedTask.completed ? 'text-green-600' : 'text-orange-600'}`}>
                  {selectedTask.completed ? 'Completed' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  toggleTaskComplete(selectedTask.id);
                  setSelectedTask({...selectedTask, completed: !selectedTask.completed});
                }}
                className={`px-4 py-2 rounded font-medium ${
                  selectedTask.completed 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                Mark as {selectedTask.completed ? 'Pending' : 'Complete'}
              </button>
              <button
                onClick={closeDetailModals}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showMealDetailModal && selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Meal Details</h3>
              <button
                onClick={closeDetailModals}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Meal Type</label>
                <p className="text-sm text-gray-900 capitalize">{selectedMeal.mealType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipe</label>
                <p className="text-sm text-gray-900">{getRecipeName(selectedMeal.recipeId)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-sm text-gray-900">{formatDate(selectedMeal.date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-sm text-gray-900">{getUserName(selectedMeal.assignedTo)}</p>
              </div>
              {(() => {
                const recipe = recipes.find(r => r.id === selectedMeal.recipeId);
                return recipe ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                    <p className="text-sm text-gray-900">{recipe.ingredients.join(', ')}</p>
                    {recipe.url && (
                      <div className="mt-2">
                        <a 
                          href={recipe.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Recipe →
                        </a>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={closeDetailModals}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskMealManager;