import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/LoadingScreen'

export default function RootIndex() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (user) {
      router.replace('/(tabs)')
    } else {
      router.replace('/login')
    }
  }, [user, isLoading])

  return <LoadingScreen />
}
