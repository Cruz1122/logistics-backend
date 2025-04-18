pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/Cruz1122/logistics-backend.git', branch: 'main'
            }
        }

        stage('Build services') {
            steps {
                sh 'docker-compose build'
            }
        }
        // stage('Run tests') {
        //     steps {
        //         sh 'docker-compose run --rm auth npm test'
        //     }
        // }

        stage('Push images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def services = ['backend-auth-service', 'backend-orders-service', 'api-gateway', 'backend-geo-service', 'backend-inventory-service','backend-reports-service'] 
                    for (service in services) {
                        def tag = "${DOCKER_REGISTRY}/${service}:latest"
                        sh "docker tag ${service} ${tag}"
                        sh "docker push ${tag}"
                    }
                }
            }
        }

        // stage('Deploy') {
        //     when {
        //         branch 'main'
        //     }
        //     steps {
        //         sh 'ssh user@mi-servidor "cd /ruta/proyecto && git pull && docker-compose pull && docker-compose up -d"'
        //     }
        // }
    }
}
