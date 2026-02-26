const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

// Mock storage for demo/hub features
const userWellbeingSettings = new Map();
const userEducationProgress = new Map();
const userA11ySettings = new Map();

// Wellbeing
exports.getWellbeingSettings = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    let settings = userWellbeingSettings.get(userId);
    if (!settings) {
        settings = {
            dailyScreenTimeLimit: 120,
            breakReminders: true,
            breakInterval: 30,
            quietHoursEnabled: false,
            mindfulScrolling: true,
            contentFilters: ['politics', 'news']
        };
        userWellbeingSettings.set(userId, settings);
    }
    const currentDailyUsage = Math.floor(Math.random() * (settings.dailyScreenTimeLimit + 30));
    response.success(res, { settings, currentDailyUsage });
});

exports.updateWellbeingSettings = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    let settings = userWellbeingSettings.get(userId) || {};
    settings = { ...settings, ...req.body };
    userWellbeingSettings.set(userId, settings);
    response.success(res, settings, 'Wellbeing settings updated');
});

// Education
exports.getEducationProgress = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    let progress = userEducationProgress.get(userId);
    if (!progress) {
        progress = {
            enrolledCourses: [
                { id: 'c1', title: 'Viral Growth Strategies 101', progress: 65, totalModules: 12, completedModules: 8 }
            ],
            certificatesEarned: 2,
            totalHoursLearned: 14.5
        };
        userEducationProgress.set(userId, progress);
    }
    response.success(res, progress);
});

// Accessibility
exports.getA11ySettings = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    let settings = userA11ySettings.get(userId);
    if (!settings) {
        settings = { highContrast: false, largeText: false, reduceMotion: false, autoCaptions: true };
        userA11ySettings.set(userId, settings);
    }
    response.success(res, settings);
});

exports.updateA11ySettings = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    let settings = userA11ySettings.get(userId) || {};
    settings = { ...settings, ...req.body };
    userA11ySettings.set(userId, settings);
    response.success(res, settings, 'Accessibility preferences updated');
});
