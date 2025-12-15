import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Bell, X, Loader2 } from 'lucide-react';
import { getNotificationPreference, saveNotificationPreference } from '../services/supabaseService';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  clientId: string;
  clientName: string;
  userEmail: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
  userId,
  clientId,
  clientName,
  userEmail,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vestingAlertsEnabled, setVestingAlertsEnabled] = useState(true);
  const [days7, setDays7] = useState(true);
  const [days30, setDays30] = useState(true);
  const [isoExerciseAlertsEnabled, setIsoExerciseAlertsEnabled] = useState(true);
  const [isoExerciseAlertDays, setIsoExerciseAlertDays] = useState(60);
  const [taxPlanningAlertsEnabled, setTaxPlanningAlertsEnabled] = useState(true);
  const [amtExposureAlertsEnabled, setAmtExposureAlertsEnabled] = useState(true);
  const [amtThreshold, setAmtThreshold] = useState(100000);
  const [email, setEmail] = useState(userEmail);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, userId, clientId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const pref = await getNotificationPreference(userId, clientId);
      if (pref) {
        setVestingAlertsEnabled(pref.vestingAlertsEnabled);
        setDays7(pref.vestingAlertDays.includes(7));
        setDays30(pref.vestingAlertDays.includes(30));
        setIsoExerciseAlertsEnabled(pref.isoExerciseAlertsEnabled);
        setIsoExerciseAlertDays(pref.isoExerciseAlertDays);
        setTaxPlanningAlertsEnabled(pref.taxPlanningAlertsEnabled);
        setAmtExposureAlertsEnabled(pref.amtExposureAlertsEnabled);
        setAmtThreshold(pref.amtThreshold);
        setEmail(pref.email);
      } else {
        setEmail(userEmail);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const vestingAlertDays: number[] = [];
      if (days7) vestingAlertDays.push(7);
      if (days30) vestingAlertDays.push(30);

      await saveNotificationPreference(userId, clientId, {
        vestingAlertsEnabled,
        vestingAlertDays,
        isoExerciseAlertsEnabled,
        isoExerciseAlertDays,
        taxPlanningAlertsEnabled,
        amtExposureAlertsEnabled,
        amtThreshold,
        email,
      });

      onClose();
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 bg-gradient-to-r from-tidemark-navy to-tidemark-blue sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-white" />
              <h2 className="text-xl font-bold text-white">Email Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
          <p className="text-sm text-blue-200 mt-1">Configure alerts for {clientName}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-tidemark-blue" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Notifications will be sent to this email address
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Vesting Event Alerts</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Get notified before equity vests
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vestingAlertsEnabled}
                    onChange={(e) => setVestingAlertsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tidemark-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tidemark-blue"></div>
                </label>
              </div>

              {vestingAlertsEnabled && (
                <div className="ml-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={days7}
                      onChange={(e) => setDays7(e.target.checked)}
                      className="rounded border-slate-300 text-tidemark-blue focus:ring-tidemark-blue"
                    />
                    <span className="text-sm text-slate-600">7 days before vesting</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={days30}
                      onChange={(e) => setDays30(e.target.checked)}
                      className="rounded border-slate-300 text-tidemark-blue focus:ring-tidemark-blue"
                    />
                    <span className="text-sm text-slate-600">30 days before vesting</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">ISO Exercise Deadline Alerts</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Reminders for 90-day post-termination exercise window
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isoExerciseAlertsEnabled}
                    onChange={(e) => setIsoExerciseAlertsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tidemark-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tidemark-blue"></div>
                </label>
              </div>

              {isoExerciseAlertsEnabled && (
                <div className="ml-4">
                  <label className="block text-xs text-slate-600 mb-1">Alert me this many days before expiration:</label>
                  <input
                    type="number"
                    value={isoExerciseAlertDays}
                    onChange={(e) => setIsoExerciseAlertDays(parseInt(e.target.value) || 60)}
                    min="1"
                    max="90"
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                  />
                  <span className="text-xs text-slate-500 ml-2">days</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">Year-End Tax Planning</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Annual reminders for tax planning opportunities
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxPlanningAlertsEnabled}
                    onChange={(e) => setTaxPlanningAlertsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tidemark-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tidemark-blue"></div>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-700">AMT Exposure Warnings</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Alerts when AMT exposure exceeds threshold
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={amtExposureAlertsEnabled}
                    onChange={(e) => setAmtExposureAlertsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-tidemark-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tidemark-blue"></div>
                </label>
              </div>

              {amtExposureAlertsEnabled && (
                <div className="ml-4">
                  <label className="block text-xs text-slate-600 mb-1">Alert threshold:</label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-slate-600">$</span>
                    <input
                      type="number"
                      value={amtThreshold}
                      onChange={(e) => setAmtThreshold(parseInt(e.target.value) || 100000)}
                      min="0"
                      step="10000"
                      className="w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Get notified when planned exercises create AMT exposure above this amount
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
