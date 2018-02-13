class SpotinstServerlessObject {
  constructor() {
    this.config = {
      servicePath: ""
    }
  }
  
  
  //get provider
  getProvider(x) {
    return "spotinst";
  }
  
  
}
module.exports = SpotinstServerlessObject;