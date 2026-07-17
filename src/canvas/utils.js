export default  {
  methods: {
    hasRole: function () {

    },
    checkAccess: function (all, action, effect) {
      const accessMap = all.accessMap || []
      for (let i = 0; i < accessMap.length; i++) {
        if (accessMap[i][0] === action && accessMap[i][1] === effect) {
          return true
        }
      }
      return false
    },
    msToTime: function (ms) {
      let seconds = (ms / 1000).toFixed(1);
      let minutes = (ms / (1000 * 60)).toFixed(1);
      let hours = (ms / (1000 * 60 * 60)).toFixed(1);
      let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

      if (seconds < 5) return ms + " ms"
      else if (seconds < 60) return seconds + " s";
      else if (minutes < 60) return minutes + " m";
      else if (hours < 24) return hours + " h";
      else return days + " d"
    }
  },
}
