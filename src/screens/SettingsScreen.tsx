import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(true);

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: '🔔',
          label: 'Notifications',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        {
          icon: '🌙',
          label: 'Dark Mode',
          type: 'toggle' as const,
          value: darkMode,
          onToggle: setDarkMode,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: '📄',
          label: 'Terms of Service',
          type: 'link' as const,
          onPress: () => Linking.openURL('https://example.com/terms'),
        },
        {
          icon: '🔒',
          label: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => Linking.openURL('https://example.com/privacy'),
        },
        {
          icon: 'ℹ️',
          label: 'App Version',
          type: 'info' as const,
          value: '1.0.0',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: '❓',
          label: 'Help & FAQ',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          icon: '📧',
          label: 'Contact Support',
          type: 'link' as const,
          onPress: () => Linking.openURL('mailto:support@smile.app'),
        },
        {
          icon: '⭐',
          label: 'Rate App',
          type: 'link' as const,
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Settings</Text>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.items.map((item, itemIndex) => (
            <TouchableOpacity
              key={itemIndex}
              style={styles.settingItem}
              onPress={item.type === 'link' ? item.onPress : undefined}
              disabled={item.type !== 'link'}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>

              {item.type === 'toggle' && (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: colors.border, true: colors.primaryDim }}
                  thumbColor={item.value ? colors.primary : colors.textSecondary}
                />
              )}

              {item.type === 'link' && (
                <Text style={styles.chevron}>›</Text>
              )}

              {item.type === 'info' && (
                <Text style={styles.infoValue}>{item.value}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ by Smile Team</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingVertical: spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

export default SettingsScreen;
