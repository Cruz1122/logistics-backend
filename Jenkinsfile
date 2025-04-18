pipeline {
  agent any

  environment {
    DOCKER_BUILDKIT = 1
  }

  stages {
    stage('Clonar repo') {
      steps {
        git url: 'https://github.com/Cruz1122/logistics-backend.git', branch: 'develop'
      }
    }

    stage('Construir imágenes Docker') {
      steps {
        sh 'docker compose build'
      }
    }

    stage('Probar servicios') {
      steps {
        sh 'docker compose up -d'
        // Aquí podrías correr pruebas con curl, Jest, etc.
      }
    }

    stage('Parar servicios') {
      steps {
        sh 'docker compose down'
      }
    }
  }
}
