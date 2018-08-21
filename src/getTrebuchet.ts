import Trebuchet from './Trebuchet'

const getTrebuchet = async (thunks: Array<() => Trebuchet>) => {
  for (let i = 0; i < thunks.length; i++) {
    const trebuchet = thunks[i]()
    if (await trebuchet.isSupported()) {
      return trebuchet
    }
  }
  return null
}

export default getTrebuchet
