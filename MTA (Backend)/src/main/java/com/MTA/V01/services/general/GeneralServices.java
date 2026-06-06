package com.MTA.V01.services.general;

import com.MTA.V01.models.User;
import com.MTA.V01.models.enumerations.ERelationshipType;
import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.security.services.UserDetailsImpl;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class GeneralServices {
    @Autowired
    private UserRepository userRepository;

    public User getSelf(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof AnonymousAuthenticationToken){
            throw new RuntimeException("user not authenticated");
        }
        return userRepository.findById(((UserDetailsImpl)authentication.getPrincipal()).getId()).get();
    }

    public User getUser(Long id){
        if (userRepository.existsById(id)){
            return userRepository.findById(id).get();
        }
        return null;
    }

    //code generation logic
    private String generateCode(){
        return RandomStringUtils.insecure().nextAlphanumeric(6).toUpperCase();
    }

    public String getFamilyCode(User target){
        if (target.getFamilyCode()==null || !target.getFamilyCodeGeneratedAt().equals(LocalDate.now())){
            target.setFamilyCode(generateCode());
            target.setFamilyCodeGeneratedAt(LocalDate.now());
            userRepository.save(target);
        }
        return userRepository.findById(target.getId()).get().getFamilyCode();
    }

    public String getPatientDoctorCode(User target){

        if (target.getPatientCode()==null || !target.getPatientCodeGeneratedAt().equals(LocalDate.now())){
            target.setPatientCode(generateCode());
            target.setPatientCodeGeneratedAt(LocalDate.now());
            userRepository.save(target);

        }
        return userRepository.findById(target.getId()).get().getPatientCode();
    }

    public String refreshFamilyCode(){
        User self = getSelf();
        self.setFamilyCode(generateCode());
        self.setFamilyCodeGeneratedAt(LocalDate.now());
        userRepository.save(self);
        return userRepository.findById(self.getId()).get().getFamilyCode();
    }

    public String refreshPatientCode(){
        User self = getSelf();
        self.setPatientCode(generateCode());
        self.setPatientCodeGeneratedAt(LocalDate.now());
        userRepository.save(self);
        return userRepository.findById(self.getId()).get().getPatientCode();
    }

    //inverse family relationship logic

    public ERelationshipType inverseOfRelationshipType(ERelationshipType type){
        return switch (type) {
            case CHILD -> ERelationshipType.PARENT;
            case PARENT -> ERelationshipType.CHILD;
            case SIBLING,SPOUSE -> type;
            default -> ERelationshipType.OTHER;
        };
    }
}
