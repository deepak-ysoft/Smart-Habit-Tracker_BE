const NotificationSettings = require("../models/NotificationSettings");
const { success, error } = require("../utils/response");

exports.getSettings = async (req, res) => {
  try {
    let settings = await NotificationSettings.findOne();

    if (!settings) {
      settings = new NotificationSettings({
        habitReminderNotify: true,
        streakMilestoneNotify: true,
        weeklySummaryNotify: true,
        monthlySummaryNotify: true,
      });
      await settings.save();
    }

    return success(res, "Notification settings fetched successfully", settings);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      habitReminderNotify,
      streakMilestoneNotify,
      weeklySummaryNotify,
      monthlySummaryNotify,
    } = req.body;

    let settings = await NotificationSettings.findOne();

    if (!settings) {
      settings = new NotificationSettings();
    }

    if (habitReminderNotify !== undefined)
      settings.habitReminderNotify = habitReminderNotify;
    if (streakMilestoneNotify !== undefined)
      settings.streakMilestoneNotify = streakMilestoneNotify;
    if (weeklySummaryNotify !== undefined)
      settings.weeklySummaryNotify = weeklySummaryNotify;
    if (monthlySummaryNotify !== undefined)
      settings.monthlySummaryNotify = monthlySummaryNotify;

    settings.updatedAt = new Date();
    await settings.save();

    return success(res, "Notification settings updated successfully", settings);
  } catch (err) {
    return error(res, err.message);
  }
};
