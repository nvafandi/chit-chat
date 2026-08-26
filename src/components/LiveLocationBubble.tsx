import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { subscribeToLiveLocation } from '@/services/firebase';
import type { LiveLocation, Message } from '@/types';

interface Props {
  message: Message;
}

export default function LiveLocationBubble({ message }: Props) {
  const location = message.location!;
  const [liveData, setData] = useState<LiveLocation | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const unsub = subscribeToLiveLocation(message.id, (data) => {
      setData(data);
      if (data && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          600
        );
      }
    });
    return () => unsub();
  }, [message.id]);

  const lat = liveData?.latitude ?? location.latitude;
  const lng = liveData?.longitude ?? location.longitude;

  function openMaps() {
    const url =
      Platform.OS === 'ios'
        ? `maps://app?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={openMaps}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.dot, !liveData?.active && styles.dotStopped]} />
          <Text style={styles.title}>
            {liveData === null || liveData.active ? 'Live Location' : 'Live Location berakhir'}
          </Text>
        </View>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            pinColor={liveData?.active === false ? '#757575' : '#4caf50'}
          />
        </MapView>
        <Text style={styles.footer}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1d1626',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  dotStopped: {
    backgroundColor: '#757575',
  },
  title: {
    color: '#f2f2f2',
    fontSize: 13,
    fontWeight: '700',
  },
  map: {
    width: '100%',
    height: 140,
  },
  footer: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
