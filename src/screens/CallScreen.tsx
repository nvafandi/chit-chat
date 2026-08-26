import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  VideoTrack,
  AudioSession,
  isTrackReference,
  type TrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { LIVEKIT_URL } from '@/utils/const';
import { generateLiveKitToken } from '@/services/livekit';

interface Props {
  roomName: string;
  identity: string;
  displayName: string;
  onLeave: () => void;
}

export default function CallScreen({ roomName, identity, displayName, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    AudioSession.startAudioSession();
    try {
      setToken(generateLiveKitToken({ identity, name: displayName, room: roomName }));
    } catch (e) {
      console.warn('[Call] token error:', e);
    }
    return () => {
      AudioSession.stopAudioSession();
    };
  }, [identity, displayName, roomName]);

  if (!token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#641efd" />
        <Text style={styles.hint}>Menyiapkan call...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect={true}
        options={{ adaptiveStream: true, dynacast: true }}
        audio={true}
        video={false}
        onDisconnected={onLeave}
        onError={(err) => console.warn('[Call] error:', err)}
      >
        <CallView roomName={roomName} displayName={displayName} onLeave={onLeave} />
      </LiveKitRoom>
    </View>
  );
}

function CallView({
  roomName,
  displayName,
  onLeave,
}: {
  roomName: string;
  displayName: string;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function toggleMic() {
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  async function toggleShare() {
    const next = !sharing;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setSharing(next);
    } catch (e) {
      console.warn('[Call] screenshare failed:', e);
    }
  }

  async function leave() {
    await room.disconnect();
    onLeave();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}># {roomName}</Text>
        <Text style={styles.sub}>{displayName} • {room.remoteParticipants.size + 1} peserta</Text>
      </View>

      <TracksGrid tracks={tracks} />

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.ctrlBtn, !micOn && styles.ctrlOff]} onPress={toggleMic}>
          <Text style={styles.ctrlIcon}>{micOn ? '🎙️' : '🔇'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, camOn && styles.ctrlOn]} onPress={toggleCam}>
          <Text style={styles.ctrlIcon}>🎥</Text>
        </TouchableOpacity>
        {Platform.OS === 'android' && (
          <TouchableOpacity style={[styles.ctrlBtn, sharing && styles.ctrlOn]} onPress={toggleShare}>
            <Text style={styles.ctrlIcon}>{sharing ? '🛑' : '🖥️'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.leaveBtn} onPress={leave}>
          <Text style={styles.leaveIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TracksGrid({ tracks }: { tracks: ReturnType<typeof useTracks> }) {
  const visible = tracks.filter((t): t is TrackReference => isTrackReference(t));

  if (visible.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Belum ada video / share layar</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {visible.map((ref, i) => (
        <VideoTrack key={i} trackRef={ref as TrackReference} style={styles.tile} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 60,
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  sub: {
    color: '#8b8b8b',
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 6,
  },
  tile: {
    flexGrow: 1,
    aspectRatio: 1.4,
    borderRadius: 12,
    backgroundColor: '#1d1626',
    minWidth: '45%',
  },
  hint: {
    color: '#717171',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 14,
    backgroundColor: '#1d1626',
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#322b3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlOn: {
    backgroundColor: '#641efd',
  },
  ctrlOff: {
    backgroundColor: '#b13535',
  },
  ctrlIcon: {
    fontSize: 20,
  },
  leaveBtn: {
    width: 60,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveIcon: {
    fontSize: 20,
  },
});
