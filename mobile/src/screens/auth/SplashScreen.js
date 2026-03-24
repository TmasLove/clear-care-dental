import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../utils/colors';

const SplashScreen = ({ navigation }) => {
  const logoOpacity = new Animated.Value(0);
  const logoScale = new Animated.Value(0.85);
  const taglineOpacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>🦷</Text>
        </View>
        <Text style={styles.logoTextPrimary}>Clear Care</Text>
        <Text style={styles.logoTextSecondary}>DENTAL</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>Transparent Dental Benefits</Text>
        <View style={styles.taglineLine} />
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Clear Care</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoMarkText: {
    fontSize: 38,
    color: colors.white,
    lineHeight: 44,
  },
  logoTextPrimary: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
    lineHeight: 48,
  },
  logoTextSecondary: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 8,
    marginTop: 2,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    fontWeight: '300',
    marginBottom: 12,
  },
  taglineLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
