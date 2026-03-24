import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';

const Header = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  transparent = false,
  light = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12 },
        transparent && styles.transparent,
        light && styles.light,
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backIcon, light && styles.backIconLight]}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleContainer}>
          {title && (
            <Text
              style={[styles.title, light && styles.titleLight]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, light && styles.subtitleLight]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSlot}>
          {rightComponent || <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  light: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    fontSize: 32,
    color: colors.white,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
  },
  backIconLight: {
    color: colors.primary,
  },
  placeholder: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  titleLight: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  subtitleLight: {
    color: colors.textSecondary,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
});

export default Header;
